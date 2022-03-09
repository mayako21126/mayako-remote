/*
 * @Description: 
 * @Version: 2.0
 * @Autor: mayako
 * @Date: 2022-03-09 11:03:04
 * @LastEditors: mayako
 * @LastEditTime: 2022-03-09 11:31:52
 */
const fs = require('fs'); 
const esprima = require('esprima');  



var code = fs.readFileSync('http://localhost:5000/remoteEntry.js'); 
var ast = esprima.parse(code); 

console.log(ast.body[1].expression.right.callee.body.body[1].declarations[0].init.properties[0].value.body.body[0].declarations[0].init.properties);