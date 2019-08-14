const XLSX = require('xlsx');
const fs = require('fs');

function sheetToJson(xlsxFile, outputFile, configFile) {
	let workbook = XLSX.readFile(xlsxFile);	
	let config = require(configFile);
	let sheetName = config.name;
	let sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
	sheet.forEach(i => {
		i.payload = JSON.parse(i.payload);
	})
	fs.writeFileSync(outputFile, JSON.stringify(sheet));
}
exports.sheetToJson = sheetToJson;
// sheetToJson('./wi-uservice.xlsx', './wi-uservice.json', './src/config/config.js');
