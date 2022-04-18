#!/usr/bin/env node

const fs = require('fs'); 
const esprima = require('esprima');  
const http = require('http');
const estraverse = require('estraverse');
const co = require('co');
const path = require('path');
const setting = require(path.resolve('settings.js'));
const axios = require('axios');
const qs = require('qs');
const escodegen = require('escodegen');
const { evaluate } = require('eval-estree-expression');

var dirPath = path.resolve(setting.basePath, 'mod');
let getPath = {};
let chunkObj = {};
let getCssPath = null;
let chunkCssObj = {};
createDir(dirPath);
getUrls(setting);

function createDir(dirPath){
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
        console.log('文件夹创建成功');
    } else {
        console.log('文件夹已存在');
    }
}
// 创建路径
function writeFileRecursive(path, buffer, callback){
    let lastPath = path.substring(0, path.lastIndexOf('/'));
    fs.mkdir(lastPath, {recursive: true}, (err) => {
        if (err) return callback(err);
        fs.writeFile(path, buffer, function(err){
            if (err) return callback(err);
            return callback(null);
        });
    });
}
function downFile(url, fileName) {
    return new Promise(function (resolve, reject) {
        http.get(url, function (response) {undefined;
            response.setEncoding('binary');  //二进制binary
            var Data = '';
            response.on('data', function (data) {    //加载到内存
                Data += data;
            }).on('end', function () {  
                writeFileRecursive(fileName, Data , function () {undefined;
                    console.log('ok');
                    resolve('下载成功');
                });
            });
        }).on('error',(e)=>{
            reject(e);
        });

    });}

function downFileArray(base,files,modObjectName,getFn){
    co(function* () {
    //循环多线程下载
        for (let i = 0; i <files.length; i++) {
            console.log(files[i]);
            let fileName = './'+getFn(files[i]);
            let url = base+ getFn(files[i]);
            createDir(path.resolve(dirPath, modObjectName));
            try {
                yield downFile(url, path.resolve(dirPath+'/'+modObjectName, fileName));
                console.log('下载成功' + fileName);
            } catch (err) {
                console.log(err);
                break;
            }
        }
    });
}

async function getUrls(setting) {
    let list = [];
    Object.keys(setting.mods).forEach(i => {
        list.push(i);
    });
    let {data} = await axios({
        method: 'Get',
        url: setting.url,
        params: {remoteList:list},
        paramsSerializer :function(params){
            return qs.stringify(params);
        }
    });
    // 转为map对象的模组对象 如 buiness:[xx,xx,xx]
    let modObjectMap = toMap(data.data);
    Object.keys(setting.mods).forEach(i => {
        if(setting.mods[i].length>0){
            downMods(i,modObjectMap.get(i),setting.mods[i]);
        }
    });
}
function toMap(list) {
    const map = new Map();
    list.forEach((item) => {
        map.set(Object.keys(item)[0], item[Object.keys(item)[0]]);
    });
    return map;
}
// downMods('','http://localhost:5006/test/remoteEntry.js',['License']);
function downMods(modObjectName,url,mods){
    http.get(url, function (response) {undefined;
        response.setEncoding('binary');  //二进制binary
        var Data = '';
        response.on('data', function (data) {    //加载到内存
            Data += data;
        }).on('end', function () {          //加载完
            var ast = esprima.parse(Data); 
            // console.log(ast);
            let modMap = new Map();
            estraverse.traverse(ast, {  
                enter: function (node,p) {
                    if(node.type === 'MemberExpression'&&node.property){
                        if(node.property.type==='Identifier'&&node.property.name==='u'){
                            console.log(node);
                            const options = {
                                functions: true,
                                generate: escodegen.generate
                            };
                            if(p.right&&p.right.type==='FunctionExpression'){
                                getPath = evaluate.sync(p.right,{},options);
                                chunkObj = evaluate.sync(p.right.body.body[0].argument.left.right.object);
                            }
                            
                        }
                    }
                    if(node.type === 'MemberExpression'&&node.property){
                        if(node.property.type==='Identifier'&&node.property.name==='miniCssF'){
                            console.log(node);
                            const options = {
                                functions: true,
                                generate: escodegen.generate
                            };
                            if(p.right){
                                getCssPath = evaluate.sync(p.right,{},options);
                            }
                          
                        }
                    }
                    if(node.type === 'MemberExpression'&&node.property){
                        if(node.property.type==='Identifier'&&node.property.name==='miniCss'){
                            console.log(node);
                            const options = {
                                functions: true,
                                generate: escodegen.generate
                            };
                            if(p.right){
                                chunkCssObj = evaluate.sync(p.right.body.body[0].declarations[0].init,{},options);
                            }
                        
                        }
                    }
                    if ((node.type === 'Literal'||node.type==='Identifier')&&(mods.includes(node.value)||mods.includes(node.name)) ) {
                        let args = p.value.body.body[0].argument.callee.object.arguments[0];
                        if(args.type==='ArrayExpression'){
                            let tempArray = [];
                            args.elements.forEach(element => {
                                tempArray.push(element.arguments[0].value);
                            });
                            modMap.set(node.value||node.name,tempArray);
                        }else{
                            modMap.set(node.value||node.name,[args.value]);
                        }
                    }  
                }
            });
            if(setting.Maximum){
                Object.keys(chunkObj).forEach((key) => {
                    downFileArray(url.replace('remoteEntry.js',''),[key],modObjectName,getPath);
                });
                if(getCssPath){
                    Object.keys(chunkCssObj).forEach((key) => {
                        downFileArray(url.replace('remoteEntry.js',''),[key],modObjectName,getCssPath);
                    });
                }
            }else{
                mods.forEach((key)=>{
                    downFileArray(url.replace('remoteEntry.js',''),modMap.get(key),modObjectName,getPath);
                    if(getCssPath&&chunkCssObj[key]===1){
                        downFileArray(url.replace('remoteEntry.js',''),[key],modObjectName,getCssPath);
                    }
                });

            }
            downFile(url, path.resolve(dirPath+'/'+modObjectName, 'remoteEntry.js'));
        });
    });
}
