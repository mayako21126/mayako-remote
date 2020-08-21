/*
 * @Description:
 * @Version: 2.0
 * @Autor: mayako
 * @Date: 2020-05-29 15:00:28
 * @LastEditors: mayako
 * @LastEditTime: 2020-08-20 14:56:02
 */
export const asyncJsonp = (() => {
    const cacheMap = {};
    return (path, delay = 120) => {
        if (!path || cacheMap[path]) return;
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.charset = 'utf-8';
            script.timeout = delay;
            script.src = path;

            const onScriptComplete = (event) => {
                script.onerror = script.onload = null;
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
                onScriptComplete({ type: 'timeout', target: script });
            }, delay * 1000);

            script.onerror = script.onload = onScriptComplete;
            document.head.appendChild(script);
        });
    };
})();

/**
 * @description: 从远程地址获取模块
 * @param {string} 远程包名
 * @param {string} 模块名
 * @param {string} 远程包地址
 * @return: 模块
 * @author: mayako
 */
export async function getComponentFromRemote(remote, com, path) {
    if (path && !window[remote]) {
        await asyncJsonp(path);
    }
    const inputFactory = await window[remote].get(com);
    return inputFactory().default;
}

export default {
    getComponentFromRemote: getComponentFromRemote,
    asyncJsonp: asyncJsonp
};
