(function () {
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
    typeString += `${
      isExport ? "export " : ""
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

  inputEditor.setValue(`{ 
    state: 200, 
    msg: "操作成功", 
    data: [
      { id:1, title:'fruge365' },
      { id:2, title:'ICEWANTWANT' }, 
      { id:3, title:'jarrtyme' },
      { id:4, title:'mnisting' },
      { id:5, title:'zombie' },
    ] 
}`);

  const onJs2ts = (editorContent) => {
    const content = new Function("return " + editorContent)();
    outputEditor.setValue(js2ts(content));
  };

  inputEditor.on("blur", () => {
    onJs2ts(inputEditor.getValue());
  });

  document.querySelector(".convert-btn").onclick = () => {
    onJs2ts(inputEditor.getValue());
  };

  // document.querySelector(".copy-btn").onclick = async () => {
  //   const content = outputEditor.getValue();
  //   await navigator.clipboard.writeText(content);
  // };

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
    // location.href = "https://github.com/job-tools/chrome-js2ts";
    window.open("https://github.com/job-tools/chrome-js2ts");
  };
  // const content = eval(`(${inputEle.value})`);
  // onJs2ts(inputEditor.getValue());
})();
