const _ = require("lodash");
const moment = require("moment");
const { Op } = require("sequelize");
const c = require("../config/constants");

const commonHelper = {
  formatUserName: (user) => {
    return user
      ? user.firstName +
      (user.middleName ? ` ${user.middleName}` : "") +
      " " +
      user.lastName
      : "";
  },
  safeJsonParse: (input) => {
    // Check if the input is a string
    if (typeof input === "string") {
      try {
        // Try parsing the JSON string
        return JSON.parse(input);
      } catch (error) {
        console.error("Invalid JSON string:", error);
        return null; // Return null or handle the error appropriately
      }
    }
    // If it's already an object, return it as is
    else if (typeof input === "object" && input !== null) {
      return input;
    }

    // Handle other types (e.g., null, undefined, numbers, etc.)
    console.warn("Input is neither a string nor a JSON object.");
    return null;
  },

  formatAddress: (address) => {
    const { address1, address2, city, state, country, zip } = address;
    return `${address1} ${address2} ${city} ${state} ${country} ${zip}`;
  },
  generatePassword(length = 8) {
    const characters =
      "ABCDEFGHJKLMNPRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789";
    let password = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      password += characters[randomIndex];
    }
    return password;
  },
  timeFormat1: (time) => {
    if (time) {
      return moment(time).local().format("MMMM Do YYYY, h:mm:ss a");
    }
  },
  timeFormat2: (time) => {
    if (time) {
      return moment(time).local().format("MMMM Do YYYY");
    }
  },
  dateTimeView: (value, format) => {
    return moment(value)
      .local()
      .format(format || "MMMM Do YYYY, h:mm: a");
  },
  shortLargeString: (s) => {
    return s.length > 50 ? `${s.slice(0, 70)}...` : s;
  },
  dateView: (value, format) => {
    return moment(value)
      .local()
      .format(format || "MMMM Do YYYY");
  },
  todayDate: () => {
    let date = new Date();
    return moment(date).local().format("MMMM Do YYYY, h:mm a");
  },

  getDifferingValues: (object1, object2) => {
    let differingValues = {};

    for (let key in object2) {
      if (object1[key] !== object2[key]) {
        differingValues[key] = object2[key];
      }
    }

    return differingValues;
  },
  objectFormatter: (obj, fieldsToSpread) => {
    const spreadedObject = {};
    fieldsToSpread.forEach((field) => {
      if (obj.hasOwnProperty(field)) {
        spreadedObject[field] = obj[field];
      }
    });
    return spreadedObject;
  },
  priceView: (amount) => {
    return `₹ ${amount}`;
  },
  decimalView: (num, place = 2) => {
    return (Math.floor((parseFloat(num) + Number.EPSILON) * 100) / 100).toFixed(
      place
    );
  },
  phoneView: (number) => {
    return `+91 ${number}`;
  },

  getKtWeight: (item, goldQualityKT) => {
    const abs = 2;
    if (item) {

      let weight = parseFloat(commonHelper.getKtWeightBySales(item, goldQualityKT)).toFixed(abs);
      if (weight > 0) {
        return weight;
      } else {
        switch (goldQualityKT || item.DmKt) {
          case "14KT":
            return (parseFloat(item?.DmWaxWt) * 14.1).toFixed(abs);
          case "18KT":
            return (parseFloat(item?.DmWaxWt) * 15.7).toFixed(abs);
          case "9KT":
          case "09KT":
            return (parseFloat(item?.DmWaxWt) * 11.2).toFixed(abs);
          case "SILVER":
          case "SL925":
            return (parseFloat(item?.DmWaxWt) * 10.5).toFixed(abs);
          case "PLATINUM":
          case "PT950":
            return (parseFloat(item?.DmWaxWt) * 22).toFixed(abs);
          default:
            return 0;
        }
      }
    }
  },

  convertMetalWeight: (inputWeight, fromMetal, toMetal) => {
    if (!c.conversionTable[fromMetal] || !c.conversionTable[fromMetal][toMetal]) {
      return 0;
    }
    const factor = c.conversionTable[fromMetal][toMetal];
    return parseFloat((inputWeight * factor).toFixed(4));
  },

  getKtWeightBySales: (item, goldQualityKT) => {
    return commonHelper.convertMetalWeight(item.rmWt, commonHelper.getMetalRmCode(item.rmMetal), commonHelper.getMetalRmCode(goldQualityKT));
  },
  getMetalCtgFromCode: (code) => {
    if (code.startsWith("G")) {
      return "G";
    } else if (code.startsWith("S")) {
      return "S";
    } else if (code.startsWith("P")) {
      return "P";
    } else {
      return "G";
    }
  },

  getMetalRmCode: (metal) => {
    if (metal) {
      switch (metal) {
        case "9KT":
        case "9K":
        case "09KT":
          return "G09W";
        case "10KT":
        case "10K":
          return "G10W";
        case "14KT":
        case "14K":
          return "G14W";
        case "18KT":
        case "18K":
          return "G18W";
        case "SILVER":
        case "SL925":
          return "SL925";
        case "PLATINUM":
        case "PT950":
          return "PT950";
        case "PL999":
          return "PL999";
        default:
          return metal;
      }
    } else return metal;
  },
  /**
   *
   * @param {*} search search is string
   * @param {*} keyNames keyNames are array of object 
   * @param  name is keyName of table
   * @param  type is required and can be "OR" "AND" 
   * @param  equalityType default is "like" or can be "equal"
   * 
   * @example search = "hello" keyNames = [{name:"name",type:"OR",equalityType:"equal"},{name:"email",type:"AND",type:"like"}]
   *@returns {
        [Op.or]: [
          { Ctg: { [Op.like]: `%${search}%` } },
        ],
        ctgDesc: { [Op.like]: `%${search}%` },
        Desc:search
      };
      */
  getSearchSqlWhereCondition: (search, keyNames) => {
    let whereCondition = {};
    if (!search) {
      return whereCondition;
    }
    const orItem = _.filter(keyNames, (key) => key.type === "OR");
    const andItem = _.filter(keyNames, (key) => key.type === "AND");
    let orCondition = [];
    _.forEach(orItem, (item) => {
      orCondition.push({
        [item.name]:
          item?.equalityType == "equal" ? search : { [Op.like]: `%${search}%` },
      });
    });
    //inserting condition in where condition of orCondition is not empty
    if (!_.isEmpty(orCondition)) {
      whereCondition[Op.or] = orCondition;
    }

    _.forEach(andItem, (item) => {
      whereCondition[item.name] =
        item?.equalityType == "equal"
          ? search
          : {
            [Op.like]: `%${search}%`,
          };
    });

    return whereCondition;
  },

  // Extract JSON using regex
  extractJson: (str) => {
    const match = str.match(/```json([\s\S]*?)```/);
    return match ? JSON.parse(match[1].trim()) : null;
  },
  // getReportsHtml: (title, data, widthArray = []) => {
  //   //console.log("===data", data);
  //   let html = `<h3>${title}</h3>`
  //   if (_.isEmpty(data)) {
  //     html += `<div style='text-align: center'>No data found</div>`;
  //     return html; ``
  //   }
  //   html += `<table border="1" cellpadding="5" cellspacing="0" style="width: 100%; min-width: 100%; border-collapse: collapse; border: 1px solid #161616; table-layout: fixed;">`
  //   html += `<thead>`
  //   html += `<tr>`
  //   _.forEach(_.keys(data[0]), (item, index) => {
  //     html += `<th style="text-align: start" ${widthArray[index] ? `width="${widthArray[index]}"` : ''}>${item}</th>`
  //   })
  //   html += `</tr>`
  //   html += `</thead>`
  //   html += `<tbody>`
  //   _.forEach(data, (item) => {
  //     html += `<tr>`
  //     _.forEach(_.keys(item), (key) => {
  //       html += `<td>${item[key]}</td>`
  //     })
  //     html += `</tr>`
  //   })
  //   html += `</tbody>`
  //   html += `</table>`
  //   return html
  // }
  getReportsHtml: (title, data, widthArray = []) => {
    let html = `<div >`
    html+=`<div style="margin-top: 20px; padding: 8px; border-radius: 8px 8px 0px 0px; background: #C2E2F1; background: linear-gradient(90deg,rgba(194, 226, 241, 1) 0%, rgba(127, 153, 186, 1) 100%);">`
    html += `<h3 style="margin:5px 0px; color: #2c3e50; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;  font-weight: 600; ">${title}</h3>`
    html+=`</div>`
    if (_.isEmpty(data)) {
      html += `<div style='text-align: center; padding: 20px; color: #7f8c8d; font-family: "Segoe UI", sans-serif; font-size: 16px;'>No data found</div>`;
      return html;
    }

    html += `<table border="1" cellpadding="12" cellspacing="0" style="width: 100%; min-width: 100%; border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; box-shadow: 0 4px 6px rgba(0,0,0,0.1);overflow: hidden;border-color: rgba(127, 153, 186, 1);">`
    html += `<thead>`
    html += `<tr style="width: 100%; ">`

    _.forEach(_.keys(data[0]), (item, index) => {
      html += `<th align="left" style=" color: #B5B5B5; font-weight: 600; padding: 8px 5px; padding-left: 13px; border: none; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;${widthArray[index] ? `width:"${widthArray[index]}%"` : ''};">${item}</th>`
    })
    html += `</tr>`
    html += `</thead>`
    html += `<tbody>`

    _.forEach(data, (item, rowIndex) => {
      const bgColor = rowIndex % 2 === 0 ? '#ffffff' : '#f8f9fa';
      html += `<tr style="width: 100%; background-color: ${bgColor}; transition: background-color 0.2s ease;">`

      _.forEach(_.keys(item), (key, index) => {
        html += `<td style="padding: 6px;padding-left: 13px;  border: none; color: #2c3e50; font-size: 12px; border-bottom: 1px solid rgba(127, 153, 186, 1); ">${item[key]}</td>`
      })

      html += `</tr>`
    })

    html += `</tbody>`
    html += `</table>`
    html += `</div>`
    return html;
  }

};
module.exports = commonHelper;


