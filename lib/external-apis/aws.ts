import AWS from 'aws-sdk';
import sharp from 'sharp';
import fileType from 'file-type';

const endpoint = new AWS.Endpoint(process.env.SPACES_ENDPOINT || "");
const s3 = new AWS.S3({
  //@ts-ignore
  endpoint,
  accessKeyId: process.env.SPACES_KEY,
  secretAccessKey : process.env.SPACES_SECRET,
});

class AwsUtils {
  static async uploadImage(filename: string, base64: string) {
    //@ts-ignore
    const fileContent = new Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
    const typeInfo: any = fileType(fileContent);

    const params = {
      ACL: 'public-read',
      ContentType: typeInfo.mime,
      Bucket: process.env.SPACES_BUCKET,
    }

    const { Location, Key } = await s3.upload({
      ...params as any,
      Body: fileContent,
      Key: `${filename}.${typeInfo.ext}`,
    }).promise();

    try {
      const resized250 = await sharp(fileContent).resize({ width: 250 }).toBuffer();
      const resized350 = await sharp(fileContent).resize({ width: 350 }).toBuffer();
      const resized500 = await sharp(fileContent).resize({ width: 500 }).toBuffer();
      const resized700 = await sharp(fileContent).resize({ width: 700 }).toBuffer();
      const resized1500 = await sharp(fileContent).resize({ width: 1500 }).toBuffer();;

      await Promise.all([
        await s3.upload({
          ...params as any,
          Body: resized250,
          Key: `${filename}_t250.${typeInfo.ext}`,
        }).promise(),
        await s3.upload({
          ...params as any,
          Body: resized350,
          Key: `${filename}_t350.${typeInfo.ext}`,
        }).promise(),
        await s3.upload({
          ...params as any,
          Body: resized500,
          Key: `${filename}_t500.${typeInfo.ext}`,
        }).promise(),
        await s3.upload({
          ...params as any,
          Body: resized700,
          Key: `${filename}_t700.${typeInfo.ext}`,
        }).promise(),
        await s3.upload({
          ...params as any,
          Body: resized1500,
          Key: `${filename}_t1500.${typeInfo.ext}`,
        }).promise(),
      ]);

    } catch(err: any) {}

    return {
      filepath: Key,
      url: Location.replace(process.env.SPACES_BUCKET_URL || "", process.env.CDN_URL || ""),
    };
  }

  static async removeImage(filepath: string) {
    await s3.deleteObject({
      Bucket: process.env.AWS_S3_BUCKET || "",
      Key: filepath,
    });
  }
}

export default AwsUtils;
