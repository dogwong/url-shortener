
/**
 * 
 * @param {import("sequelize").Sequelize} sequelize 
 * @param {import("sequelize").DataTypes} DataTypes 
 */
module.exports = (sequelize, DataTypes) => {

  let Url = sequelize.define("url", {
    // Model attributes are defined here
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    shortUrl: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(200),
    },
    longUrl: {
      type: DataTypes.STRING(2048),
      allowNull: false
    },
    click: {
      type: DataTypes.INTEGER.UNSIGNED,
      defaultValue: 0,
    },
    creator: {
      type: DataTypes.BIGINT,
    },
    deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    // Other model options go here
    indexes: [
      {
        unique: true,
        fields: ["shortUrl"]
      }
    ]
  });

  let Engagement = sequelize.define("engagement", {
    shortUrl: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    ip: {
      type: DataTypes.STRING(45),
    },
    country: {
      type: DataTypes.STRING(2),
    },
    referer: {
      type: DataTypes.STRING(2048),
    },
    userAgent: {
      type: DataTypes.STRING(2048),
    },
    isBot: {
      type: DataTypes.BOOLEAN,
    },
    secChUa: {
      type: DataTypes.STRING(200),
    },
    secChUaMobile: {
      type: DataTypes.STRING(50),
    },
    secChUaPlatform: {
      type: DataTypes.STRING(50),
    },
  }, {
    indexes: [
      {
        unique: false,
        fields: ["shortUrl"]
      }
    ],
    updatedAt: false,
  });
  Engagement.removeAttribute("id");


  return {
    Url,
    Engagement,
    
  }
};
