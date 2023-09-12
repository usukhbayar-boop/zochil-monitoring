import { extend, keys, reduce, camelCase, snakeCase } from 'lodash';
import { increment as incrementAlphanum } from './increment-alphanum';

export const camelizeKeys = (obj: { [k:string]:any }) => {
  return reduce(keys(obj), (acc, objKey) => {
    return extend(acc, { [camelCase(objKey)]: obj[objKey] });
  }, {});
};

export const snakeKeys = (obj: { [k:string]:any }) => {
  return reduce(keys(obj), (acc, objKey) => {
    return extend(acc, { [snakeCase(objKey)]: obj[objKey] });
  }, {});
};

export const deSerializeObject = (rawStringObject: string) => {
  try {
    return JSON.parse(rawStringObject);
  } catch (e) { return null; }
};

export const deSerializeArray = (rawStringList: Array<string>) => {
  if (!Array.isArray(rawStringList)) {
    return rawStringList;
  }

  return rawStringList.map((rawJSONItem) => {
    return deSerializeObject(rawJSONItem);
  }).filter(parsedObj => parsedObj);
};

export const checkPermission = (currentUser: any, groups: Array<any>, role: string) => {
  let groupArray = groups;

  if (typeof groups === 'string') {
    groupArray = [groups];
  }

  if (!currentUser) {
    throw new Error('Not logged in.');
  }

  // return true if user has a super admin privilige
  if (
    (currentUser.permissions || []).filter(
      (p: any) => (p.group === 'admin' && p.role === 'admin'),
    ).length > 0
  ) {
    return true;
  }

  // return true if user has a super admin privilige
  if (
    (currentUser.permissions || []).filter(
      (p: any) => (p.group === 'realtor' && p.role === 'realtor'),
    ).length > 0
  ) {
    return true;
  }

  // return true if user has a super admin privilige
  if (
    (currentUser.permissions || []).filter(
      (p: any) => (p.group === 'manager' && p.role === 'manager'),
    ).length > 0
  ) {
    return true;
  }

  const matchedPermissions = (currentUser.permissions || []).filter(
    (p: any) => (groupArray.indexOf(p.group) > -1 && p.role === role),
  );

  if (matchedPermissions.length === 0) {
    throw new Error('Not authorized.');
  }

  return true;
};

export const sorter = (list: Array<any> = []) => list.sort(
  (a, b) => a.ordering - b.ordering,
);

export const generatePagination = (page:number, total:number, limit:number, adjacents:number) => {
  let lastPage, lpm, num, pagination: number[], r1, r2;
  pagination = [];
  lastPage = Math.ceil(total / limit);
  lpm = lastPage - 1;
  if (lastPage > 0) {
    if (lastPage < 7 + (adjacents * 2)) {
      pagination = (function() {
        var i, ref, results;
        results = [];
        for (num = i = 1, ref = lastPage; 1 <= ref ? i <= ref : i >= ref; num = 1 <= ref ? ++i : --i) {
          results.push(num);
        }
        return results;
      })();
    } else {
      if (page < 1 + (adjacents * 3)) {
        r2 = 4 + (adjacents * 2);
        pagination = (function() {
          var i, ref, results;
          results = [];
          for (num = i = 1, ref = r2; 1 <= ref ? i <= ref : i >= ref; num = 1 <= ref ? ++i : --i) {
            results.push(num);
          }
          return results;
        })();
        pagination = pagination.concat([-1, lpm, lastPage]);
      } else if (lastPage - (adjacents * 2) > page && page > adjacents * 2) {
        r1 = page - adjacents;
        r2 = page + adjacents;
        pagination = (function() {
          var i, ref, ref1, results;
          results = [];
          for (num = i = ref = r1, ref1 = r2; ref <= ref1 ? i <= ref1 : i >= ref1; num = ref <= ref1 ? ++i : --i) {
            results.push(num);
          }
          return results;
        })();
        pagination = pagination.concat([-1, lpm, lastPage]);
        pagination = [1, 2, -1].concat(pagination);
      } else {
        r1 = lastPage - (1 + (adjacents * 3));
        pagination = (function() {
          var i, ref, ref1, results;
          results = [];
          for (num = i = ref = r1, ref1 = lastPage; ref <= ref1 ? i <= ref1 : i >= ref1; num = ref <= ref1 ? ++i : --i) {
            results.push(num);
          }
          return results;
        })();
        pagination = [1, 2, -1].concat(pagination);
      }
    }
  }
  return pagination;
}

export const pad = (input: number) => {
  const BASE = "000000";
  return input ? BASE.substr(0, 4 - Math.ceil(input / 10)) + input : BASE;
}

export const incAlphanum = (str:string, options: any) => {
  return incrementAlphanum(str, {
    dashes: false,
  });
}

export const maskText = (text: string) => {
  if (!text) {
    return "";
  }

  if (text.length > 3) {
    let maskedText = "";
    for (var i = text.length - 2; i >= 2; i--) {
      maskedText += '*';
    }

    return `${text.substr(0, 2)}${maskedText}${text[text.length - 1]}`;
  }

  return `${text[0]}**`;
}

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000);
}

export const replaceWithThumbnail = (images: string, suffix: string) => {
  return (images || '')
    .replace('.jpg', `${suffix}.jpg`)
    .replace('.jpeg', `${suffix}.jpeg`)
    .replace('.png', `${suffix}.png`)
    .replace('.webp', `${suffix}.webp`)
    .replace('.gif', `${suffix}.gif`);
}

export const nestCategories = (categories: Array<any>, parent_id?: string | number) => {
    let nested: Array<any> = [];

    if (!parent_id) {
      nested = categories.filter(c => !c.parent_id);
    } else {
      nested = categories.filter(c => c.parent_id === parent_id);
    }

    let childIndex;
    for (let i = 0; i < nested.length; i++) {
      childIndex = categories.findIndex(
        c => c.parent_id === nested[i].id
      );

      if (childIndex > -1) {
        nested[i].children = nestCategories(categories, nested[i].id);
      }
    }

    return nested;
  }

  export const isEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };
