"use strict";

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

var _require = require("@cycle/core");

var Rx = _require.Rx;

var fromEvent = require("./fromevent");
var VDOM = {
  h: require("./virtual-hyperscript"),
  diff: require("virtual-dom/diff"),
  patch: require("virtual-dom/patch"),
  parse: typeof window !== "undefined" ? require("vdom-parser") : function () {}
};

var _require2 = require("./custom-elements");

var replaceCustomElementsWithSomething = _require2.replaceCustomElementsWithSomething;
var makeCustomElementsRegistry = _require2.makeCustomElementsRegistry;

var _require3 = require("./transposition");

var transposeVTree = _require3.transposeVTree;

var matchesSelector = undefined;
// Try-catch to prevent unnecessary import of DOM-specifics in Node.js env:
try {
  matchesSelector = require("matches-selector");
} catch (err) {
  matchesSelector = function () {};
}

function isElement(obj) {
  return typeof HTMLElement === "object" ? obj instanceof HTMLElement || obj instanceof DocumentFragment : //DOM2
  obj && typeof obj === "object" && obj !== null && (obj.nodeType === 1 || obj.nodeType === 11) && typeof obj.nodeName === "string";
}

function fixRootElem$(rawRootElem$, domContainer) {
  // Create rootElem stream and automatic className correction
  var originalClasses = (domContainer.className || "").trim().split(/\s+/);
  var originalId = domContainer.id;
  //console.log('%coriginalClasses: ' + originalClasses, 'color: lightgray')
  return rawRootElem$.map(function fixRootElemClassNameAndId(rootElem) {
    var svg = false, fixedRootClassName = null;
    if (typeof rootElem.className === `string`)
      svg = false
    else if (typeof rootElem.className.baseVal === `string`)
      svg = true

    if (svg)
      fixedRootClassName = rootElem.className.baseVal;
    else
      fixedRootClassName = rootElem.className;
    var previousClasses = fixedRootClassName.trim().split(/\s+/);
    var missingClasses = originalClasses.filter(function (clss) {
      return previousClasses.indexOf(clss) < 0;
    });
    var classes = previousClasses.length > 0 ? previousClasses.concat(missingClasses) : missingClasses;
    //console.log('%cfixRootElemClassName(), missingClasses: ' +
    //  missingClasses, 'color: lightgray')
    if (svg)
      rootElem.className.baseVal = classes.join(" ").trim();
    else
      rootElem.className = classes.join(" ").trim();

    if (originalId) {
      rootElem.id = originalId;
    }
    //console.log('%c  result: ' + fixedRootClassName, 'color: lightgray')
    //console.log('%cEmit rootElem$ ' + rootElem.tagName + '.' +
    //  fixedRootClassName, 'color: #009988')
    return rootElem;
  });
}

function isVTreeCustomElement(vtree) {
  return vtree.type === "Widget" && vtree.isCustomElementWidget;
}

function makeReplaceCustomElementsWithWidgets(CERegistry, driverName) {
  return function replaceCustomElementsWithWidgets(vtree) {
    return replaceCustomElementsWithSomething(vtree, CERegistry, function (_vtree, WidgetClass) {
      return new WidgetClass(_vtree, CERegistry, driverName);
    });
  };
}

function getArrayOfAllWidgetFirstRootElem$(vtree) {
  if (vtree.type === "Widget" && vtree.firstRootElem$) {
    return [vtree.firstRootElem$];
  }
  // Or replace children recursively
  var array = [];
  if (Array.isArray(vtree.children)) {
    for (var i = vtree.children.length - 1; i >= 0; i--) {
      array = array.concat(getArrayOfAllWidgetFirstRootElem$(vtree.children[i]));
    }
  }
  return array;
}

function checkRootVTreeNotCustomElement(vtree) {
  if (isVTreeCustomElement(vtree)) {
    throw new Error("Illegal to use a Cycle custom element as the root of " + "a View.");
  }
}

function isRootForCustomElement(rootElem) {
  return !!rootElem.cycleCustomElementMetadata;
}

function wrapTopLevelVTree(vtree, rootElem) {
  if (isRootForCustomElement(rootElem)) {
    return vtree;
  }

  var _vtree$properties$id = vtree.properties.id;
  var vtreeId = _vtree$properties$id === undefined ? "" : _vtree$properties$id;
  var _vtree$properties$className = vtree.properties.className;
  var vtreeClass = _vtree$properties$className === undefined ? "" : _vtree$properties$className;

  var sameId = vtreeId === rootElem.id;
  var sameClass = vtreeClass === rootElem.className;
  var sameTagName = vtree.tagName.toUpperCase() === rootElem.tagName;
  if (sameId && sameClass && sameTagName) {
    return vtree;
  }
  var attrs = {};
  if (rootElem.id) {
    attrs.id = rootElem.id;
  }
  if (rootElem.className) {
    attrs.className = rootElem.className;
  }
  return VDOM.h(rootElem.tagName, attrs, [vtree]);
}

function makeDiffAndPatchToElement$(rootElem) {
  return function diffAndPatchToElement$(_ref) {
    var _ref2 = _slicedToArray(_ref, 2);

    var oldVTree = _ref2[0];
    var newVTree = _ref2[1];

    if (typeof newVTree === "undefined") {
      return Rx.Observable.empty();
    }

    //let isCustomElement = isRootForCustomElement(rootElem)
    //let k = isCustomElement ? ' is custom element ' : ' is top level'
    var prevVTree = wrapTopLevelVTree(oldVTree, rootElem);
    var nextVTree = wrapTopLevelVTree(newVTree, rootElem);
    var waitForChildrenStreams = getArrayOfAllWidgetFirstRootElem$(nextVTree);
    var rootElemAfterChildrenFirstRootElem$ = Rx.Observable.combineLatest(waitForChildrenStreams, function () {
      //console.log('%crawRootElem$ emits. (1)' + k, 'color: #008800')
      return rootElem;
    });
    var cycleCustomElementMetadata = rootElem.cycleCustomElementMetadata;
    //console.log('%cVDOM diff and patch START' + k, 'color: #636300')
    /* eslint-disable */
    rootElem = VDOM.patch(rootElem, VDOM.diff(prevVTree, nextVTree));
    /* eslint-enable */
    //console.log('%cVDOM diff and patch END' + k, 'color: #636300')
    if (cycleCustomElementMetadata) {
      rootElem.cycleCustomElementMetadata = cycleCustomElementMetadata;
    }
    if (waitForChildrenStreams.length === 0) {
      //console.log('%crawRootElem$ emits. (2)' + k, 'color: #008800')
      return Rx.Observable.just(rootElem);
    }
    //console.log('%crawRootElem$ waiting children.' + k, 'color: #008800')
    return rootElemAfterChildrenFirstRootElem$;
  };
}

function renderRawRootElem$(vtree$, domContainer, _ref3) {
  var CERegistry = _ref3.CERegistry;
  var driverName = _ref3.driverName;

  var diffAndPatchToElement$ = makeDiffAndPatchToElement$(domContainer);
  return vtree$.flatMapLatest(transposeVTree).startWith(VDOM.parse(domContainer)).map(makeReplaceCustomElementsWithWidgets(CERegistry, driverName)).doOnNext(checkRootVTreeNotCustomElement).pairwise().flatMap(diffAndPatchToElement$);
}

function makeRootElemToEvent$(selector, eventName) {
  return function rootElemToEvent$(rootElem) {
    if (!rootElem) {
      return Rx.Observable.empty();
    }
    var targetElements = matchesSelector(rootElem, selector) ? rootElem : rootElem.querySelectorAll(selector);
    return Rx.Observable.fromEvent(targetElements, eventName);
  };
}

function makeResponseGetter(rootElem$) {
  return function get(selector, eventName) {
    if (console && console.log) {
      console.log("WARNING: the DOM Driver's get(selector, eventType) is " + "deprecated. Use select(selector).events(eventType) instead.");
    }
    if (typeof selector !== "string") {
      throw new Error("DOM driver's get() expects first argument to be a " + "string as a CSS selector");
    }
    if (selector.trim() === ":root") {
      return rootElem$;
    }
    if (typeof eventName !== "string") {
      throw new Error("DOM driver's get() expects second argument to be a " + "string representing the event type to listen for.");
    }

    return rootElem$.flatMapLatest(makeRootElemToEvent$(selector, eventName)).share();
  };
}

function makeEventsSelector(element$) {
  return function events(eventName) {
    var useCapture = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

    if (typeof eventName !== "string") {
      throw new Error("DOM driver's get() expects second argument to be a " + "string representing the event type to listen for.");
    }
    return element$.flatMapLatest(function (element) {
      if (!element) {
        return Rx.Observable.empty();
      }
      return fromEvent(element, eventName, useCapture);
    }).share();
  };
}

function makeElementSelector(rootElem$) {
  return function select(selector) {
    if (typeof selector !== "string") {
      throw new Error("DOM driver's select() expects first argument to be a " + "string as a CSS selector");
    }
    var element$ = selector.trim() === ":root" ? rootElem$ : rootElem$.map(function (rootElem) {
      if (matchesSelector(rootElem, selector)) {
        return rootElem;
      } else {
        return rootElem.querySelectorAll(selector);
      }
    });
    return {
      observable: element$,
      events: makeEventsSelector(element$)
    };
  };
}

function validateDOMDriverInput(vtree$) {
  if (!vtree$ || typeof vtree$.subscribe !== "function") {
    throw new Error("The DOM driver function expects as input an " + "Observable of virtual DOM elements");
  }
}

function makeDOMDriverWithRegistry(container, CERegistry) {
  return function domDriver(vtree$, driverName) {
    validateDOMDriverInput(vtree$);
    var rawRootElem$ = renderRawRootElem$(vtree$, container, { CERegistry: CERegistry, driverName: driverName });
    if (!isRootForCustomElement(container)) {
      rawRootElem$ = rawRootElem$.startWith(container);
    }
    var rootElem$ = fixRootElem$(rawRootElem$, container).replay(null, 1);
    var disposable = rootElem$.connect();
    return {
      get: makeResponseGetter(rootElem$),
      select: makeElementSelector(rootElem$),
      dispose: disposable.dispose.bind(disposable)
    };
  };
}

function makeDOMDriver(container) {
  var customElementDefinitions = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  // Find and prepare the container
  var domContainer = typeof container === "string" ? document.querySelector(container) : container;
  // Check pre-conditions
  if (typeof container === "string" && domContainer === null) {
    throw new Error("Cannot render into unknown element `" + container + "`");
  } else if (!isElement(domContainer)) {
    throw new Error("Given container is not a DOM element neither a selector " + "string.");
  }

  var registry = makeCustomElementsRegistry(customElementDefinitions);
  return makeDOMDriverWithRegistry(domContainer, registry);
}

module.exports = {
  isElement: isElement,
  fixRootElem$: fixRootElem$,
  isVTreeCustomElement: isVTreeCustomElement,
  makeReplaceCustomElementsWithWidgets: makeReplaceCustomElementsWithWidgets,
  getArrayOfAllWidgetFirstRootElem$: getArrayOfAllWidgetFirstRootElem$,
  isRootForCustomElement: isRootForCustomElement,
  wrapTopLevelVTree: wrapTopLevelVTree,
  checkRootVTreeNotCustomElement: checkRootVTreeNotCustomElement,
  makeDiffAndPatchToElement$: makeDiffAndPatchToElement$,
  renderRawRootElem$: renderRawRootElem$,
  makeResponseGetter: makeResponseGetter,
  validateDOMDriverInput: validateDOMDriverInput,
  makeDOMDriverWithRegistry: makeDOMDriverWithRegistry,

  makeDOMDriver: makeDOMDriver
};