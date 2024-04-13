(function () {


    const inputEle = document.querySelector("#input");
    const outputEle = document.querySelector("#output");

    const inputEditor = CodeMirror.fromTextArea(inputEle, {
        tabSize: 2,
        smartIndent: true,
        styleActiveLine: true,
        lineNumbers: true,
        // theme: "mdn-like",
        theme: "idea",
        gutters: ["CodeMirror-linenumbers"],
        lineWrapping: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        autoRefresh: true,
    });

    const outputEditor = CodeMirror.fromTextArea(outputEle, {
        mode: "javascript",
        lineNumbers: true,
        lineWrapping: true,
        tabSize: 2,
        smartIndent: true,
        styleActiveLine: true,
        lineNumbers: true,
        theme: "idea",
        gutters: ["CodeMirror-linenumbers"],
        lineWrapping: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        autoRefresh: true,
        // readOnly: "nocursor",
    });

    const js2ts = (obj, interfaceName = "RootObject") => {
        const type = document.querySelector(
            ".choose input[type=radio]:checked"
        ).value;
        const typeEq = type === "type" ? "= " : "";
        const isExport = document.querySelector(
            ".choose input[type=checkbox]"
        ).checked;
        let typeString = "";
        const nestedTypes = [];
        for (let key in obj) {
            const value = obj[key];
            if (
                typeof value === "object" &&
                !Array.isArray(value) &&
                value !== null
            ) {
                const nestedType = js2ts(value, key);
                nestedTypes.push(nestedType);
            } else if (
                Array.isArray(value) &&
                value.length > 0 &&
                typeof value[0] === "object"
            ) {
                const elementType = js2ts(value[0], `${key}Item`);
                nestedTypes.push(elementType);
            }
        }
        if (nestedTypes.length > 0) {
            typeString += nestedTypes.join("\n") + "\n";
        }
        typeString += `${isExport ? "export " : ""
            }${type} ${interfaceName} ${typeEq}{\n`;
        for (let key in obj) {
            const value = obj[key];
            if (value !== null) {
                if (typeof value === "object" && !Array.isArray(value)) {
                    typeString += `  ${key}: ${key};\n`;
                } else if (
                    Array.isArray(value) &&
                    value.length > 0 &&
                    typeof value[0] === "object"
                ) {
                    typeString += `  ${key}: ${key}Item[];\n`;
                } else {
                    const valueType = Array.isArray(value) ? `${key}[]` : typeof value;
                    typeString += `  ${key}: ${valueType};\n`;
                }
            } else {
                typeString += `  ${key}: null;\n`;
            }
        }
        typeString += "}\n";
        return typeString;
    };




    // 得到最后的 ts 数据 
    const getTsDataFn = (text, typeInterface) => {

        // 最后我们需要的 res (js 对象类型,但是我们最后要的是字符串)
        let res = null;
        let resString = '';
        // 过滤字符串,所有的 |n \t 以及两端的空格
        const filterStringFn = (data) => data.trim().replaceAll('\n', '').replaceAll('\t', '');


        // 判断 js 对象的类型,返回的类型为 undefined | null | boolean | string | number | object , 其他的都是大写
        const typeArray = ['Boolean', 'String', 'Number', 'Object', 'Undefined', 'Null'];
        const getTypeOfDataFn = (data) => {
            let res = Object.prototype.toString.call(data).slice(8, -1);
            if (typeArray.includes(res)) {
                return res.toLowerCase();
            }
            return res;
        };

        // 判断初始类型是啥,然后初始化 res
        const initResFn = (initData) => {
            if (getTypeOfDataFn(initData) === 'object') return {};
            if (getTypeOfDataFn(initData) === 'Array') return [];
        };

        // 循环递归,将 js 中的所有的 属性值都改为字符串
        const loopFn = (data, res) => {
            for (let key in data) {
                if (getTypeOfDataFn(data[key]) === 'object') {
                    res[key] = {};
                    loopFn(data[key], res[key]);
                } else if (getTypeOfDataFn(data[key]) === 'Array') {
                    res[key] = [];
                    loopFn(data[key], res[key]);
                } else {
                    res[key] = getTypeOfDataFn(data[key] || null);
                }
            }
        };

        // 当👆面的循环结束后,要进行数组的去重
        const removeDuplicateArrays = (obj) => {
            // 如果输入不是对象或者为 null，则直接返回
            if (typeof obj !== 'object' || obj === null) {
                return obj;
            }

            // 如果输入是数组，则对数组中的元素递归调用该函数
            if (Array.isArray(obj)) {
                const jsonObj = obj.map((item) => JSON.stringify(item));
                const filterArray = [...new Set(jsonObj)];
                let res = filterArray.map((item) => JSON.parse(item));
                res = res.map((item) => {
                    if (Array.isArray(item) || getTypeOfDataFn(item) === 'object') {
                        return removeDuplicateArrays(item);
                    }
                    return item;
                });

                return res;
            }

            // 如果输入是对象，则遍历对象的属性值
            for (const prop in obj) {
                // 对于数组类型的属性值，进行去重操作
                if (Array.isArray(obj[prop]) || getTypeOfDataFn(obj[prop]) === 'object') {
                    obj[prop] = removeDuplicateArrays(obj[prop]);
                }
            }

            return obj;
        };

        // 循环添加字符串
        const loopAddStringFn = (data) => {
            // 判断输入是否为对象或者为 null
            if (typeof data !== 'object' || data === null) {
                return data;
            }

            let count = 0; // 如果是对象,记录下操作的 key 的数量,来判断哪一次是最后一次触发
            let len = Object.keys(data).length; // 记录 data 的总长度

            Object.entries(data).map(([key, value]) => {
                // 如果这里的 key 是可以转化为数组,也就是说此时的 data 是一个数组
                if (!isNaN(Number(key))) {
                    // 如果这里的事数组或者是对象,则递归调用该函数;
                    if (getTypeOfDataFn(value) === 'object' || Array.isArray(value)) {
                        // 如果是索引为 0 的情况,
                        if (key === '0') {
                            resString += '[';
                            // 数组的长度如果大于 1,则需要使用小括号,因为一个元素是 string[],两个元素是(string|number)[]
                            if (len > 1) resString += '(';
                        } else {
                            resString += '|';
                        }
                        if (JSON.stringify(value) === '{}') {
                            resString += '{}';
                        }
                        if (JSON.stringify(value) === '[]') {
                            resString += '[]';
                        }
                        loopAddStringFn(value); // 继续循环添加字符串

                        // 如果这个数组已经进行到了最后一个元素
                        if (Number(key) === len - 1) {
                            // 数组的长度如果大于 1,则需要使用小括号,因为一个元素是 string[],两个元素是(string|number)[]
                            if (len > 1) resString += ')';
                            resString += ']';
                        }
                        return;
                    }
                    // 如果不是数组也不是对象
                    if (key === '0') {
                        resString += '[';
                        // 数组的长度如果大于 1,则需要使用小括号,因为一个元素是 string[],两个元素是(string|number)[]
                        if (len > 1) resString += '(';
                        resString += value;
                    } else {
                        resString += `|${value}`;
                    }

                    // 如果这个数组已经进行到了最后一个元素
                    if (Number(key) === len - 1) {
                        // 数组的长度如果大于 1,则需要使用小括号,因为一个元素是 string[],两个元素是(string|number)[]
                        if (len > 1) resString += ')';
                        resString += ']';
                    }
                }
                // 不然这里就是对象, TODO:这里暂时不考虑 function 的参数,fucntion 统一为 Function 类型
                else {
                    if (count === 0) {
                        resString += '{';
                    } else {
                        resString += ',';
                    }

                    if (getTypeOfDataFn(value) === 'object' || Array.isArray(value)) {
                        resString += `${key}:`;

                        if (JSON.stringify(value) === '{}') {
                            resString += '{}';
                        }
                        if (JSON.stringify(value) === '[]') {
                            resString += '[]';
                        }

                        loopAddStringFn(value);
                        count++; // 操作次数增加
                        if (count === len) resString += '}';
                        return;
                    }

                    resString += `${key}:${value}`;
                    count++; // 操作次数增加
                    if (count === len) resString += '}';
                }
            });
        };

        // 找到对应的 结束索引 和 结束的字符
        const stopFn = text => {
            if (text === "{") return { start: text, end: "}" }
            if (text === "[") return { start: text, end: "]" }
            return false
        }

        // 生成随机的 8 个字符
        function generateRandomString() {
            let result = '';
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const charactersLength = characters.length;
            for (let i = 0; i < 8; i++) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
            }
            return result;
        }

        // 字符串是否符合数组形式
        const isArrayFn = (data) => /^\[\S+\]+$/.test(data);

        const resultArray = []; // 这里存储了最后要打印的字符串; key 是键值,value 是对应的字符串
        // 将最后的到的整个类型递归分割开来
        const writeTypeFn = (text, RootName) => {
            if (text === "{}") return;

            const resPre = [];
            const resSuf = [];
            const textList = text.split('');
            resPre.push(textList.shift());
            resSuf.unshift(textList.pop());

            let currentString = textList.join('');

            let startObject = { index: 0, count: 0 } // 记录初始索引和册数
            let endObject = { index: 0, count: 0 } // 记录结束索引和次数
            let string = { start: "", end: "" } // 记录初始和结束的字符串
            let objString = "";
            let hashName = "";
            const elementList = []
            const hashList = []
            for (let i = 0; i < textList.length; i++) {

                const item = textList[i];
                // 找到最后的字符串是什么
                if (!string.start && !string.end && !!stopFn(item)) {
                    const { start, end } = stopFn(item);
                    string = { start, end };
                    startObject.index = i;
                }

                if (string.start === item) startObject.count++;
                if (string.end === item) endObject.count++;
                if (startObject.count !== 0 && endObject.count !== 0 && startObject.count === endObject.count) {
                    endObject.index = i; // 记录下最后一个索引

                    objString = currentString.slice(startObject.index, endObject.index + 1)
                    // 将下面三个初始化, 循环继续 => 继续寻找
                    startObject = { index: 0, count: 0 }
                    endObject = { index: 0, count: 0 }
                    string = { start: "", end: "" }

                    // 这里如果是这两个数组,就跳出本次循环,继续下一个循环
                    if (objString === "{}" || objString === "[]") continue

                    // 获取随机名
                    hashName = generateRandomString()

                    text = text.replaceAll(objString, hashName)
                    if (objString.split("").some(item => ["{", "}", "[", "]"].includes(item))) {
                        // 这里只有是数组的时候,才会使用
                        if (isArrayFn(text)) {
                            elementList.push(objString.slice(1, objString.length - 1))
                            hashList.push(hashName)
                            if (isArrayFn(objString)) {

                                resultArray.push({ key: hashName, value: objString })
                            } else {

                                writeTypeFn(objString, hashName)
                            }
                        }
                        else {

                            writeTypeFn(objString, hashName)
                        }

                    }
                }
            }

            // 这里记录下数组中的个数,这个也是判断是 ?:还是:的依据
            let all = elementList.length;
            // 两个以上的元素才需要判断
            if (all > 1) {
                let helperList = [];
                [...new Set(elementList)].forEach(item => {
                    const list = [];
                    let isObj = false;
                    let tempString = "";
                    item.split(",").forEach(yo => {
                        if (yo.includes("[") || yo.includes("]") || yo.includes("{") || yo.includes("}") || isObj) {
                            let len = {
                                "{": 0,
                                "}": 0,
                                "[": 0,
                                "]": 0,
                            }
                            isObj = true;
                            if (tempString) tempString += ",";
                            tempString += yo;
                            for (let i = 0; i < tempString.length; i++) {
                                const font = tempString[i];
                                if (font === "{" || font === "}" || font === "[" || font === "]") len[font]++;
                            }
                            if (len["{"] === len["}"] && len["["] === len["]"]) {
                                list.push(tempString)
                                isObj = false;
                                tempString = "";
                            }
                        } else {
                            isObj = false;
                            list.push(yo)
                        }
                    })
                    list.length && list.forEach(yo => {
                        const hash = generateRandomString()
                        yo = yo.replace(":", hash);
                        const data = yo.split(hash);
                        const result = helperList.find(item => item.key === data[0]);
                        if (result) {
                            if (!result.type.includes(data[1])) result.type.push(data[1])
                            result.count++;
                        } else if (!!data[1] && (data[1][0] === "[" || (data[1][0] === "{" && data[1] !== "{}"))) {
                            const hashName = generateRandomString()
                            helperList.push({ key: data[0], count: 1, type: [hashName] });

                            writeTypeFn(data[1], hashName)
                        } else {
                            helperList.push({ key: data[0], count: 1, type: [data[1]] });
                        }
                    })
                })

                let res = ""
                helperList.forEach((item, index) => {
                    res += item.key
                    if (item.count !== all) res += "?"
                    res += ":" + item.type.join("|")
                    if (index !== helperList.length - 1) res += ","
                })

                const newName = generateRandomString()
                text = text.replace(hashList.join("|"), newName)
                // 替换结束需要将已存在的 key 删除
                hashList.forEach(item => {
                    const index = resultArray.findIndex(yo => yo.key === item)
                    if (index > 0) resultArray.splice(index, 1)
                })

                resultArray.push({ key: newName, value: `{${res}}` })

            }


            resultArray.push({ key: RootName, value: text })
        }

        const clearArrayExportStringFn = () => {
            let resultString = "";
            const res = JSON.parse(JSON.stringify(resultArray))
            for (let i = resultArray.length - 1; i >= 0; i--) {
                const element = resultArray[i];
                if (isArrayFn(element.value)) {

                    res.forEach(item => {
                        if (item.value.includes(resultArray[i].key)) {
                            item.value = item.value.replaceAll(element.key, element.value)
                            res.splice(i, 1);
                        }
                    })


                }
            }


            const res2 = JSON.parse(JSON.stringify(res))
            for (let i = res2.length - 1; i >= 0; i--) {
                const element = res2[i];
                if (element.key === "RootObject") continue
                if (!res2.some(item => item.value.includes(element.key))) {
                    res2.splice(i, 1)
                }
            }


            // 筛选掉无联系的
            res2.forEach(item => {
                const val = item.value.replaceAll("[", "").replaceAll("]", "[]")

                if (item.value.includes("|")) {
                    resultString += `export interface ${item.key} = ${val}\n`
                } else {
                    resultString += `export interface ${item.key} = ${val.replaceAll("(", "").replaceAll(")", "")}\n`
                }

            })

            return resultString

        }

        res = null; // 初始化 js 对象

        resString = ''; // 初始化最后的字符串

        let initData = new Function('return ' + filterStringFn(text))(); // 得到 js 对象
        // 判断初始类型是啥 ,然后初始化 res
        res = initResFn(initData);
        // 循环递归,将 js 中的所有的 属性值都改为字符串
        loopFn(initData, res);
        // 数组的去重
        res = removeDuplicateArrays(res);
        res = removeDuplicateArrays(res);

        // 递归增加字符串
        loopAddStringFn(res);
        // 分清楚具体哪些类型的方法
        writeTypeFn(resString, "RootObject");
        // 找到当前的字符串是几个导出,整理数组的导出
        const resultString = clearArrayExportStringFn()
        // 修改格式
        outputEditor.setValue(resultString.replaceAll("{", "{\n\t").replaceAll("}", "\n}").replaceAll(",", ",\n\t").replaceAll("}", "}\n").replaceAll(/ type | interface /g, `\t${typeInterface}\t`));
    };



    inputEditor.setValue(`{ 
        state: 200, 
        type: "操作成功", 
        data: [
        { id:1, title:'fruge365' },
        { id:2, title:'ICEWANTWANT' }, 
        { id:3, title:'jarrtyme' },
        { id:4, title:'mnisting' },
        { id:5, title:'zombie' ,test:123},
        ] 
    }`);

    const onJs2ts = (editorContent) => {

        const type = document.querySelector(
            ".choose input[type=radio]:checked"
        ).value;

        try {
            if (type === "class") {
                const content = new Function("return " + editorContent)();
                outputEditor.setValue(js2ts(content));
            } else {

                getTsDataFn(editorContent, type)
            }
        } catch (error) {
            console.log("error=>   ", error);
            alert("您输入的格式有误")
        }
    };

    inputEditor.on("blur", () => {
        onJs2ts(inputEditor.getValue());
    });

    document.querySelector(".convert-btn").onclick = () => {
        onJs2ts(inputEditor.getValue());
    };

    // 选项
    document.querySelectorAll(".choose input[type=radio]").forEach((item) => {
        item.oninput = () => {
            onJs2ts(inputEditor.getValue());
        };
    });
    document.querySelector(".choose input[type=checkbox]").oninput = () => {
        onJs2ts(inputEditor.getValue());
    };

    document.querySelector("header svg").onclick = () => {
        window.open("https://github.com/job-tools/chrome-js2ts");
    };
    // const content = eval(`(${inputEle.value})`);
    // onJs2ts(inputEditor.getValue());
})();
