/*
 * @Description:
 * @Version: 2.0
 * @Autor: mayako
 * @Date: 2019-11-22 09:29:04
 * @LastEditors: mayako
 * @LastEditTime: 2022-08-29 16:14:07
 */
module.exports = {
    basePath: '',
    mods: {
        'portal_com': ['./mailServers','./i18n']
    },
    env:'mf',
    modPaths: {
        portal_com: 'http://localhost:8088/portal/remoteEntry.js'
    },
    Maximum:true,
    url: 'http://10.32.211.211:31850/admin/demo/open/getUrls'
};
