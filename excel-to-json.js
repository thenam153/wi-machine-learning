const XLSX = require('xlsx');
const fs = require('fs');

function sheetToJson(xlsxFile, outputFile, configFile) {
	let workbook = XLSX.readFile(xlsxFile);	
	console.log(process.env.NODE_ENV);
	// let sheetName;
	var config = require(configFile).default;
	if(process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'development') {
	    config = require(configFile).development
	}else if(process.env.NODE_ENV === 'prod' || process.env.NODE_ENV === 'production') {
	    config = require(configFile).production
	}
	let sheetName = config.sheet_name;
	// if(!process.env.NODE_ENV || process.env.NODE_ENV === 'dev') {
	// 	sheetName = config.dev.name;
	// }else {
	// 	sheetName = config.product.name;
	// }
	let sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
	sheet.forEach(i => {
		i.payload = JSON.parse(i.payload);
	})
	fs.writeFileSync(outputFile, JSON.stringify(sheet));	
	
}
exports.sheetToJson = sheetToJson;
// sheetToJson('./wi-uservice.xlsx', './wi-uservice.json', './src/config/config.js');
