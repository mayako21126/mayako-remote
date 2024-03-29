/* eslint-disable no-undef */
/*
 * @Description:
 * @Version: 2.0
 * @Autor: mayako
 * @Date: 2020-05-29 15:00:28
 * @LastEditors: mayako
 * @LastEditTime: 2022-08-17 15:03:55
 */
import axios from 'axios';
import qs from 'qs';
const urlC = 'http://localhost:8001/admin/demo/open/getUrls';
export const asyncJsonp = (() => {
    const cacheMap = {};
    return (path, delay = 120) => {
        if (!path || cacheMap[path]) return;
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.charset = 'utf-8';
            script.type = 'text/javascript';
            script.async = true;
            script.timeout = delay;
            script.src = path;

            const onScriptComplete = event => {
                // script.onerror = script.onload = null
                // console.log('errorload')
                clearTimeout(timeout);
                if (event.type === 'load') {
                    cacheMap[path] = true;
                    return resolve();
                }
                const error = new Error();
                error.name = 'Loading chunk failed.';
                error.type = event.type;
                error.url = path;
                reject(error);
            };

            const timeout = setTimeout(() => {
                onScriptComplete({
                    type: 'timeout',
                    target: script
                });
            }, delay * 1000);

            script.onerror = onScriptComplete;
            document.head.appendChild(script);
            script.onload = onScriptComplete;
            script.onfaild = () => {
                reject();
            };
        });
    };
})();

class Remote {
    constructor(env = 'development', options = {}) {
        this.remoteList = [];
        // 模块管理api
        this.url = options.url || urlC;
        this.env = env;
        // 自定义访问host
        this.host = options.host || null;
        // 需要手动定义地址的path集合
        this.modPaths = options.modPaths || [];
    }
    // 初始化事件
    init(remoteList = []) {
    // loading是个promise对象用来判断读取状态
        this.loading = this.loadConfig(remoteList);
        // 用来承载每个新模块的加载promise对象
        this.loadingMap = new Map();
        this.remoteListMap = new Map();
    }
    // 根据remotelist读取配置表
    loadConfig(remoteList = []) {
    // 返回一个promise对象
        return new Promise(async (resolve, reject) => {
            if (remoteList.length > 0) {
                this.mergeList(remoteList);
            }
            let tmp = [];
            const CancelToken = axios.CancelToken;
            // axios函数，用来取消请求
            this.requestSource = CancelToken.source();
            const self = this;
            // 改这块逻辑
            // 分为3种逻辑，一种是走远端模块管理的接口，有一个总的模块管理中心，一种是离线构建模式(默认构建地址是根据qiankun判断的，也可以通过传入options.host参数设置)，一种是手动定义模块的链接地址(取决于是否有modpaths)
            if (self.env !== 'console') {
                try {
                    remoteList.forEach(element => {
                        let host = '';
                        if (self.host) {
                            host = self.host;
                        } else {
                            host = window.__POWERED_BY_QIANKUN__ ? window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__ : location.origin + '/';
                        }
                        if (self.modPaths[element]) {
                            tmp.push({
                                element: self.modPaths[element]
                            });
                        } else {
                            tmp.push({
                                element: host + 'mod/' + element + '/remoteEntry.js'
                            });
                        }
                    });
                    // 转为map对象，remoteListMap是包含远端模块名和地址的map对象
                    this.remoteListMap = this.mergeRemoteMapformList(this.remoteListMap, this.toMap(tmp));
                    // 根据配置文件载入远端配置表
                    await this.loadModules(this.remoteListMap);
                    return resolve();
                } catch (error) {
                    reject(error);
                }
            } else {
                try {
                    const { data } = await axios({
                        method: 'Get',
                        url: self.url,
                        params: { remoteList: self.remoteList },
                        paramsSerializer: function (params) {
                            return qs.stringify(params);
                        }
                    });
                    tmp = data.data;
                    // 转为map对象，remoteListMap是包含远端模块名和地址的map对象
                    this.remoteListMap = this.mergeRemoteMapformList(this.remoteListMap, this.toMap(tmp));
                    // 根据配置文件载入远端配置表
                    await this.loadModules(this.remoteListMap);
                    return resolve();
                } catch (e) {
                    console.log(e);
                    return reject();
                }
            }
        });
    }
    loadModules(list) {
        return new Promise((resolve, reject) => {
            // 记录需要动态挂载的modules
            const modules = [];
            // 遍历读取加载模块
            list.forEach((value, key) => {
                if (!window[key]) {
                    const pi = asyncJsonp(value);
                    modules.push(pi);
                }
            });
            Promise.all(modules)
                .then(() => {
                    console.log('import modules finish');
                    resolve();
                })
                .catch(e => {
                    console.log(e);
                    reject();
                });
        });
    }
    // 合并传入的远端模块list
    mergeList(tmp = []) {
        this.remoteList = Array.from(new Set([...this.remoteList, ...tmp]));
    }
    // 更新remoteListMap
    mergeRemoteMap(value, key) {
        this.remoteListMap.set(value, key);
    }
    // 合并remoteListMap
    mergeRemoteMapformList(obj, src) {
        if (!obj) {
            obj = new Map();
        }
        for (const [k, v] of src) {
            if (obj.has(k)) {
                obj.set(k, obj.get(k));
            } else {
                obj.set(k, v);
            }
        }
        return obj;
    }
    toMap(list) {
        const map = new Map();
        list.forEach(item => {
            map.set(Object.keys(item)[0], item[Object.keys(item)[0]]);
        });
        return map;
    }
    // 根据name获取对应远端路径
    getPath(name) {
        if (!this.remoteListMap) {
            return '';
        } else {
            return this.remoteListMap[name];
        }
    }

    /**
   * @description: 从远程地址获取模块
   * @param {string} 远程包名
   * @param {string} 模块名
   * @param {string} 远程包地址
   * @return: 模块
   * @author: mayako
   */
    async getComponentFromRemote(remote, com, path) {
    // 等待初始加载
    // return async () => {
    //   // Initializes the share scope. This fills it with known provided modules from this build and all remotes
    //   await __webpack_init_sharing__('default');
    //   const container = window[scope]; // or get the container somewhere else
    //   // Initialize the container, it may provide shared modules
    //   await container.init(__webpack_share_scopes__.default);
    //   const factory = await window[scope].get(module);
    //   const Module = factory();
    //   return Module;
    // };

        await this.loading;
        if (this.loadingMap.get(remote)) {
            await this.loadingMap.get(remote);
        }
        // 如果有地址且没有找到组件，则通过path远程加载
        if (path && !window[remote]) {
            this.mergeList([remote]);
            this.mergeRemoteMap(remote, path);
            const tmp = asyncJsonp(path);
            this.loadingMap.set(remote, tmp);
            await tmp;
            this.loadingMap.delete(remote);
        }
        // 如果组件没有找到，且没有地址。则重新执行初始化
        if (!path && !window[remote]) {
            const tmp = this.loadConfig([remote]);
            this.loadingMap.set(remote, tmp);
            await tmp;
            this.loadingMap.delete(remote);
        }
        await __webpack_init_sharing__('default');
        const container = window[remote];
        await container.init(__webpack_share_scopes__.default);
        const inputFactory = await window[remote].get(com);
        return inputFactory();
    }
}

export default {
    asyncJsonp: asyncJsonp,
    Remote: Remote
};
