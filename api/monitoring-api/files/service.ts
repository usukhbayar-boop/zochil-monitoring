import path from "path";
import { v4 as uuid } from "uuid";

import AwsUtils from "lib/external-apis/aws";
import APIService from "core/base/service";
import { replaceWithThumbnail } from "lib/utils";
import { DBConnection, ID } from "core/types";

export default class UploaderService extends APIService {
  constructor(db: DBConnection) {
    super(db, "files");
  }

  async uploadImage(image: string) {
    const filename = uuid();
    const { filepath, url } = await AwsUtils.uploadImage(filename, image);
    await super.insert({
      file_type: "image",
      filepath
    });

    return { url: replaceWithThumbnail(url, "_t500") };
  }

  async uploadImages(images: string[]) {
    const urls = [];
    if (Array.isArray(images)) {
      for (const image of images) {
        const { url } = await this.uploadImage(image);
        urls.push(url);
      }
    }

    return { urls };
  }

  async removeImage(url: string) {
    const image = await super.findOne("filepath", path.basename(url));
    if (image && image.filepath) {
      await AwsUtils.removeImage(image.filepath);
    } else {
      throw { message: "image not found or invalid image" };
    }

    await this.removeById(image.id);
  }
}
