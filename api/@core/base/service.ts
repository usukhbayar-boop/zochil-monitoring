import constants from "./constants";
import logger from "lib/utils/logger";
import { validationResult } from "express-validator";
import {
  ApiRequest,
  DBQuery,
  DBConnection,
  ApiHandler,
  ApiResponse,
  ApiFilter,
  ApiOptions
} from "core/types";

export default class APIService {
  connector: DBConnection;
  tableName: string;

  constructor(connector: DBConnection, tableName: string) {
    this.connector = connector;
    this.tableName = tableName;
  }

  setTableName(tableName: string) {
    this.tableName = tableName;
  }

  async findAll(
    conditions: ApiFilter,
    tableName: string = this.tableName,
    options: ApiOptions = {}
  ) {
    if (options && options.limit && options.limit > 2000) {
      options.limit = 2000;
    }

    return this.connector
      .db_readonly(tableName)
      .where(conditions || {})
      .offset(((options.page || 1) - 1) * (options.limit || 20))
      .limit(options.limit || 20)
      .orderBy(
        options.orderFields || [
          {
            column: options.sortField || "created_at",
            order: options.sortDirection || "desc"
          }
        ]
      );
  }

  async findForList(
    filters: ApiFilter = {},
    options: ApiOptions = {},
    tableName = this.tableName,
    extra: {
      listCursor?: DBQuery;
      countCursor?: DBQuery;
    } = {}
  ): Promise<{
    list: Array<any>;
    totalCount: number;
  }> {
    const listCursor =
        extra.listCursor || this.connector.db_readonly(tableName),
      countCursor = extra.countCursor || this.connector.db_readonly(tableName),
      rawFilters = [],
      equalityFilters: ApiFilter = {};

    const filterKeys = Object.keys(filters);

    for (const filterKey of filterKeys) {
      if (
        typeof filters[filterKey] === "string" ||
        typeof filters[filterKey] === "boolean" ||
        typeof filters[filterKey] === "number"
      ) {
        equalityFilters[`${tableName}.${filterKey}`] = filters[filterKey];
      }

      if (
        Array.isArray(filters[filterKey]) &&
        filters[filterKey].length === 2 &&
        typeof filters[filterKey][0] === "string" &&
        typeof filters[filterKey][1] === "object"
      ) {
        rawFilters.push({
          query: filters[filterKey][0],
          params: filters[filterKey][1]
        });
      }
    }

    for (const cursor of [listCursor, countCursor]) {
      if (cursor !== countCursor) {
        if (Array.isArray(options.fields)) {
          cursor.select(
            options.fields.map((field) =>
              field.indexOf(".") === -1 ? `${tableName}.${field}` : field
            )
          );
        } else {
          if (cursor === listCursor) {
            cursor.select(`${tableName}.*`);
          }
        }
      }

      if (Array.isArray(options.joins)) {
        options.joins.forEach((join) => {
          if (join && join.length == 4) {
            const joinMethod = (cursor as any)[join[0]];
            joinMethod.apply(cursor, [join[1], join[2], join[3]]);
          }
        });
      }
      cursor.where(equalityFilters);
      rawFilters.forEach((rawFilter) =>
        //@ts-ignore
        cursor.whereRaw(rawFilter.query, rawFilter.params)
      );
    }

    //@ts-ignore
    const list = await this.paginateCursor(listCursor, options);

    const totalCount = await countCursor
      //@ts-ignore
      .count(`${tableName}.id`)
      .then((rows: Array<{ count: number }>) => {
        if (rows && rows.length) {
          return rows[0].count || 0;
        }

        return 0;
      });

    return { list, totalCount };
  }

  async findOne(field: string, value: any, tableName = this.tableName) {
    const rows = await this.connector
      .db_readonly(tableName)
      .where({ [field]: value });
    return Array.isArray(rows) ? rows.pop() : null;
  }

  async findOneByConditions(conditions: ApiFilter, tableName = this.tableName) {
    const rows = await this.connector.db_readonly(tableName).where(conditions);
    return Array.isArray(rows) ? rows.pop() : null;
  }

  async insert(
    values: { [key: string]: any },
    tableName = this.tableName,
    returnField = "id"
  ) {
    const ids = await this.connector
      .db(tableName)
      .insert(values)
      .returning(returnField);
    return ids[0];
  }

  async update(
    values: { [key: string]: any },
    conditions: ApiFilter,
    tableName = this.tableName
  ) {
    const args = Array.isArray(conditions) ? conditions : [conditions];

    await this.connector
      .db(tableName)
      //@ts-ignore
      .where(...args)
      .update({
        ...values,
        updated_at: new Date()
      });
  }

  async increment(
    field: string,
    conditions: ApiFilter,
    tableName = this.tableName,
    step: number = 1
  ) {
    await this.connector.db(tableName).where(conditions).increment(field, step);
  }

  async removeById(id: string | number, tableName = this.tableName) {
    await this.connector.db(tableName).where({ id }).del();
  }

  async removeByConditions(conditions: ApiFilter, tableName = this.tableName) {
    await this.connector.db(tableName).where(conditions).del();
  }

  async count(conditions: ApiFilter, tableName = this.tableName) {
    const args = Array.isArray(conditions) ? conditions : [conditions];

    const result = await this.connector
      .db(tableName)
      //@ts-ignore
      .where(...args)
      .count();

    if (result && result.length) {
      return result[0].count;
    }

    return 0;
  }

  async paginateCursor(
    cursor: any,
    options: ApiOptions = {
      page: 1,
      limit: 50,
      sortDirection: "desc",
      sortField: "created_at"
    }
  ) {
    if (options.limit && options.limit > 1000 && !options.exceed_limit) {
      options.limit = 1000;
    }

    return await cursor
      .offset(((options.page || 1) - 1) * (options.limit || 20))
      .limit(options.limit || 20)
      .orderBy(
        options.orderFields || [
          {
            column: options.sortField || "created_at",
            order: options.sortDirection || "desc",
            nulls: "last",
          }
        ]
      );
  }

  async handleRunner(job: { data: any }, done: Function, runner: Function) {
    try {
      await runner(job.data);
    } catch (err: any) {
      logger.error({
        message: err.message
      });
    }

    done();
  }

  ok(res: ApiResponse, payload: any) {
    return res.json({ status: constants.OK, ...payload });
  }

  error(
    res: ApiResponse,
    status: string = constants.ERROR,
    code = 500,
    validatorErrors: Array<any> | null = null,
    error_message: string | null = null
  ) {
    return res.status(code).json({
      status,
      message: error_message,
      ...(!validatorErrors ? {} : { validatorErrors })
    });
  }

  handleRequest(handler: ApiHandler, req: ApiRequest, res: ApiResponse) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return Promise.reject({
        responseCode: 422,
        validatorErrors: errors.array()
      });
    }

    return new Promise(async (resolve, reject) => {
      try {
        const result = await handler(req, res);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }).then((result) => result);
  }

  handle(handler: ApiHandler) {
    return (req: ApiRequest, res: ApiResponse) =>
      this.handleRequest(handler, req, res).catch((error) =>
        this.handlerErrorCallback(error, res, req)
      );
  }

  handleOk(handler: ApiHandler) {
    return (req: ApiRequest, res: ApiResponse) => {
      // logger.info({
      //   level: "info",
      //   path: req.originalUrl,
      //   http_method: req.method,
      // });

      return this.handleRequest(handler, req, res)
        .then((result) => this.ok(res, result))
        .catch((error) => this.handlerErrorCallback(error, res, req));
    };
  }

  handlerErrorCallback(error: any, res: ApiResponse, req: ApiRequest) {
    logger.error({
      path: req.originalUrl,
      http_method: req.method,
      message: error.stack || error.message
    });
    this.error(
      res,
      error.responseStatus,
      error.responseCode,
      error.validatorErrors,
      error.error_message
    );
  }
}
