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

var dirPath = path.resolve(setting.basePath, 'mod');

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
function downFile(url, fileName) {
    return new Promise(function (resolve, reject) {
        http.get(url, function (response) {undefined;
            response.setEncoding('binary');  //二进制binary
            var Data = '';
            response.on('data', function (data) {    //加载到内存
                Data += data;
            }).on('end', function () {  
                fs.writeFile(fileName, Data , function () {undefined;
                    console.log('ok');
                    resolve('下载成功');
                });
            });
        }).on('error',(e)=>{
            reject(e);
        });

    });}

function downFileArray(base,files,modObjectName){
    co(function* () {
    //循环多线程下载
        for (let i = 0; i <files.length; i++) {
            console.log(files[i]);
            let fileName = files[i]+'.'+files[i]+'.js';
            let url = base+ files[i]+'.'+files[i]+'.js';
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
                    if (node.type === 'Literal'&&mods.includes(node.value) ) {
                        let args = p.value.body.body[0].argument.callee.object.arguments[0];
                        if(args.type==='ArrayExpression'){
                            let tempArray = [];
                            args.elements.forEach(element => {
                                tempArray.push(element.arguments[0].value);
                            });
                            modMap.set(node.value,tempArray);
                        }else{
                            modMap.set(node.value,[args.value]);
                        }
                    }  
                }  
            }); 
            mods.forEach((name)=>{
                downFileArray(url.replace('remoteEntry.js',''),modMap.get(name),modObjectName);
            });
            downFile(url, path.resolve(dirPath+'/'+modObjectName, 'remoteEntry.js'));
        });
    });
}
