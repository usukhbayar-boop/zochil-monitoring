const { createLogger, format, transports , winston} = require("winston");
const { combine, timestamp, prettyPrint, colorize, errors,  } = format;

const logger = createLogger({
    // change level if in dev environment versus production
    level: "debug",
    format: combine(
      errors({ stack: true }), // <-- use errors format
      colorize(),
      timestamp(),
      prettyPrint()
    ),
    transports : [
      new transports.Console({
        level: 'info',
        format: format.combine(
          format.colorize(),
          format.simple()
        )
      }),
      new transports.Http({
        level: 'warn',
        format: format.json()
      }),

    ]


  });


export default logger;
