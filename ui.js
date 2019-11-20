'use strict';
var myInterpreter = null;
function initAlert(interpreter, scope) {
  var wrapper = function(text) {
    return alert(arguments.length ? text : '');
  };
  interpreter.setProperty(
    scope,
    'alert',
    interpreter.createNativeFunction(wrapper)
  );
}

function parseButton() {
  var code = editor.getDoc().getValue();
  myInterpreter = null;
  myInterpreter = new Interpreter(code, initAlert, debugCallbacks);
  disable('');
}

function debugCallbacks(event, node, state, scope) {
  if (myInterpreter === null || !myInterpreter.started) {
    return;
  }
  const blacklist = {
    'Determining callee': 1,
    'Determining args': 1,
    'Executing native call': 1
  };
  if (event in blacklist) {
    return;
  }

  if (event === 'Call complete') {
    if (state.isConstructor) {
      log.innerHTML +=
        style_event('Return value ') +
        style_literal('new ' + state.func_.class) +
        '<br/>';
    } else {
      let value = state.value;
      if (value instanceof Interpreter.Object) {
        value = value.properties;
      }
      log.innerHTML +=
        style_event('Return value ') +
        style_literal(JSON.stringify(value)) +
        '<br/>';
    }
  } else if (event === 'Executing simple call') {
    log.innerHTML += style_event('Calling function ') + segText(node) + '<br/>';
  } else if (event === 'Executing async call') {
    log.innerHTML += style_event('Calling function ') + segText(node) + '<br/>';
  } else {
    log.innerHTML +=
      style_event(event) + ':: ' + nodeText(node, true) + '</br>';
  }
  //log.innerHTML += style_literal(JSON.stringify(node)) + "</br>";
  //log.innerHTML += style_literal(JSON.stringify(state)) + "</br>";
}

var stepAllInterval = null;
function stepAllButton() {
  stepAllInterval = setInterval(stepButton, 5);
}

function stepButton() {
  myInterpreter.started = true;
  if (myInterpreter.stateStack.length) {
    let topframe =
      myInterpreter.stateStack[myInterpreter.stateStack.length - 1];
    var node = topframe.node;
    var start = node.start;
    var end = node.end;

    // Is this the first time we're in this frame or are we coming back to it?
    let first = false;
    if (node.used == undefined) {
      node.used = true;
      first = true;
    }

    // Log what we're doing
    let loghtml = nodeText(node, first);
    if (loghtml) {
      if (loghtml.length > 500) {
        loghtml = loghtml.slice(0, 500);
      }
      if (!first) {
        loghtml = style_dim(loghtml);
      }
      let extra_value = '';
      // Log any addition value
      if (topframe.value != undefined) {
        if (topframe.value.class === 'Function') {
        } else if (isInternalObj(topframe.value)) {
        } else {
          //extra_value = " (value: " + style_literal(JSON.stringify(topframe.value)) +")";
        }
      }
      //if (!loghtml.startsWith("FunctionDeclaration")) {
      log.innerHTML += loghtml + extra_value + '</br>';
      log.scrollTop = log.scrollHeight;
      //}
    }
  } else {
    var start = 0;
    var end = 0;
  }
  editor.setSelection(editor.posFromIndex(start), editor.posFromIndex(end));
  editor.focus();
  try {
    var ok = myInterpreter.step();
  } finally {
    if (!ok) {
      disable('disabled');
      clearInterval(stepAllInterval);
    }
  }
}

function isInternalObj(obj) {
  return (
    obj instanceof Interpreter.Object ||
    (Array.isArray(obj) && obj.length && obj[0] instanceof Interpreter.Object)
  );
}

function nodeText(node, first) {
  let cont = first ? '' : 'Continuing: ';
  if (node.type === 'BinaryExpression') {
    return (
      cont +
      'Performing ' +
      style_literal(node.operator) +
      ' between ' +
      segText(node.left) +
      ' and ' +
      segText(node.right)
    );
  } else if (node.type === 'Program') {
    return cont + 'Running program';
  } else if (node.type === 'ExpressionStatement') {
    return cont + 'Running expression ' + segText(node);
  } else if (node.type === 'CallExpression') {
    //return cont + "Calling " + segText(node.callee);
    return null;
  } else if (node.type === 'MemberExpression') {
    return cont + 'Examining member ' + segText(node);
  } else if (node.type === 'Identifier') {
    return cont + 'Using value of identifier: ' + style_literal(node.name);
  } else if (node.type === 'Literal') {
    return cont + 'Using value of literal: ' + style_literal(node.value);
  } else if (node.type === 'ArrowFunctionExpression') {
    return cont + 'Creating lambda ' + segText(node);
  } else if (node.type === 'VariableDeclaration') {
    return cont + 'Variable declared with ' + style_literal(node.kind);
  } else if (node.type === 'ObjectExpression') {
    return cont + 'Object creation ' + segText(node);
  } else if (node.type === 'BlockStatement') {
    return cont + 'Block statement';
  } else {
    return (
      cont + node.type + ' ============> ' + JSON.stringify(node) + '</br>'
    );
    //return node.type;
  }
}

function segText(seg) {
  if (seg.start == undefined) {
    return '';
  }
  return style_snippet(
    editor
      .getDoc()
      .getValue()
      .substring(seg.start, seg.end)
  );
}

function style_snippet(txt) {
  return '<span class="snippet">' + txt + '</span>';
}

function style_literal(txt) {
  return '<span class="literal">' + (txt ? txt : '""') + '</span>';
}

function style_dim(txt) {
  return '<span class="dim">' + txt + '</span>';
}

function style_event(txt) {
  return '<span class="event">' + txt + '</span>';
}

function runButton() {
  disable('disabled');
  if (myInterpreter.run()) {
    // Async function hit.  There's more code to run.
    disable('');
  }
}

function disable(disabled) {
  document.getElementById('stepButton').disabled = disabled;
  document.getElementById('stepAllButton').disabled = disabled;
  document.getElementById('runButton').disabled = disabled;
}

var editor = CodeMirror.fromTextArea(document.getElementById('code'), {
  lineNumbers: true,
  matchBrackets: true,
  continueComments: 'Enter',
  theme: 'abcdef',
  extraKeys: { 'Ctrl-Q': 'toggleComment' }
});
//editor.setOption("theme", "ambiance");
