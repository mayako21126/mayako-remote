/*
 * @Description: 
 * @Version: 2.0
 * @Autor: mayako
 * @Date: 2020-08-20 14:54:13
 * @LastEditors: mayako
 * @LastEditTime: 2020-08-21 09:43:26
 */
module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "node": true
    },
    "extends": [
        "eslint:recommended",
    ],
    "parserOptions": {
        "sourceType": "module",
        "ecmaVersion": 8
    },
    "rules": {
        "indent": [
            "error",
            4
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ],
        "no-console": "off",
    }
};
