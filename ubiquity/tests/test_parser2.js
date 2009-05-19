Components.utils.import("resource://ubiquity/modules/utils.js");
Components.utils.import("resource://ubiquity/modules/cmdmanager.js");
Components.utils.import("resource://ubiquity/modules/nounutils.js");
Components.utils.import("resource://ubiquity/modules/parser/new/namespace.js");
Components.utils.import("resource://ubiquity/tests/test_suggestion_memory.js");
Components.utils.import("resource://ubiquity/tests/framework.js");

const LANG = "en";
const MAX_SUGGESTIONS = 10;

// Code duplicated with test_parser1... should be merged into
// testing_stubs.js maybe?
var fakeContextUtils = {
  getHtmlSelection: function(context) { return context.htmlSelection; },
  getSelection: function(context) { return context.textSelection; },
  getSelectionObject: function(context) {return { text: context.textSelection,
                                                  html: context.htmlSelection
                                                };}
};

function makeTestParser(lang, verbs, nouns, contextUtils) {
  lang = lang ? lang : LANG;
  verbs = verbs ? verbs : [];
  nouns = nouns ? nouns : [];

  if (!contextUtils)
    contextUtils = fakeContextUtils;

  return NLParser2.makeParserForLanguage(lang, verbs, nouns, contextUtils,
                                        new TestSuggestionMemory());
}

function getCompletions( input, verbs, nountypes, context ) {
  if (!context)
    context = { textSelection: "", htmlSelection: "" };
  var parser = makeTestParser( LANG,
			       verbs,
			       nountypes,
                               fakeContextUtils,
                               new TestSuggestionMemory() );
  var query = parser.newQuery( input, context, MAX_SUGGESTIONS );
  //dump("Query step is " + query._step + "\n");
  return query.suggestionList;
}

// End duplicated code

// Infrastructure for asynchronous tests:
function getCompletionsAsync( input, verbs, nountypes, context, callback) {
  if (!context)
  context = { textSelection: "", htmlSelection: "" };
  var parser = makeTestParser( LANG,
			       verbs,
			       nountypes,
                               fakeContextUtils,
                               new TestSuggestionMemory() );
  var query = parser.newQuery( input, context, MAX_SUGGESTIONS );
  query.onResults = function() { callback(query.suggestionList); };
}

/* TODO have some timeout so we don't hang forever if finishTest doesn't
 * get called.
 */
function AsyncTestManager() {
  this.init();
}
AsyncTestManager.prototype = {
  init: function() {
    this._testIsDone = false;
  },

  finishTest: function() {
    this._testIsDone = true;
  },

  waitForTestToFinish: function() {
    var threadManager = Components.classes["@mozilla.org/thread-manager;1"]
                          .getService();
    var thread = threadManager.currentThread;
    while ( this._testIsDone == false ) {
      thread.processNextEvent( true );
    }
  }

};


function testParserTwoDirectOnly() {
  var dogGotPetted = false;
  var dog = new NounUtils.NounType( "dog", ["poodle", "golden retreiver",
				  "beagle", "bulldog", "husky"]);

  var cmd_pet = {
    execute: function(context, arguments) {
      dogGotPetted = arguments.object.text;
    },
    names: {
      en: ["pet"]
    },
    arguments: [
      {role: 'object', nountype: dog}
    ]
  };

  var _assert = this.assert;
  var atm = new AsyncTestManager();

  var testFunc = function(completions) {
    _assert( completions.length == 2, "should be 2 completions" );
    _assert( completions[0]._verb.text == "pet", "verb should be pet");
    _assert( completions[0].args.object[0].text == "beagle",
      "obj should be beagle");
    _assert( completions[1]._verb.text == "pet", "verb should be pet");
    _assert( completions[1].args.object[0].text == "bulldog",
      "obj should be bulldog");
    completions[0].execute();
    _assert( dogGotPetted == "beagle");
    completions[1].execute();
    _assert( dogGotPetted == "bulldog" );
    atm.finishTest();
  };

  getCompletionsAsync( "pet b", [cmd_pet], [dog], null, testFunc );
  atm.waitForTestToFinish();
}

function testParserTwoParseWithModifier() {
  // wash dog with sponge
  var dogGotWashed = null;
  var dogGotWashedWith = null;
  var dog = new NounUtils.NounType( "dog", ["poodle", "golden retreiver",
				"beagle", "bulldog", "husky"]);
  var washingObj = new NounUtils.NounType( "washing object",
					  ["sponge", "hose", "spork",
					  "bathtub", "fire hose"]);
  var cmd_wash = {
    execute: function(context, arguments) {
      dogGotWashed = arguments.object.text;
      dogGotWashedWith = arguments.instrument.text;
    },
    names: {
      en: ["wash"]
    },
    arguments: [
      {role: 'object', nountype: dog },
      {role: 'instrument', nountype: washingObj }
    ]
  };

  var inputWords = "wash pood with sp";

  var _assert = this.assert;
  var atm = new AsyncTestManager();

  var testFunc = function(completions) {
    _assert( completions.length == 2, "Should be 2 completions" );
    completions[0].execute();
    _assert( dogGotWashed == "poodle");
    _assert( dogGotWashedWith == "sponge");
    completions[1].execute();
    _assert( dogGotWashed == "poodle");
    _assert( dogGotWashedWith == "spork");
    atm.finishTest();
  };

  getCompletionsAsync( inputWords, [cmd_wash], [dog, washingObj], null,
                       testFunc);
  atm.waitForTestToFinish();
}

/*function testParserTwoInternationalization() {

}*/

/*
function testNounTypeSpeed() {
  var slownoun = new NounUtils.NounType('anything');
  slownoun.suggest = function(text) {
    dump('checking '+text+'\n');
    var start = new Date();
    var now = null;
    do { now = new Date(); }
    while(now - start < 1000);
    return [ NounUtils.makeSugg(text) ];
  };

  var cmd_hit = {

    execute: function(context, arguments) {
      dogGotPetted = arguments.object.text;
    },
    names: {
      en: ["hit"]
    },
    arguments: [
      {role: 'object', nountype: slownoun}
    ]
  };
  var completions = getCompletions( "hit me", [cmd_hit], [slownoun], null );
  dump("Completions are: " + completions + "\n");
  dump("First verb is " + completions[0]._verb.text + "\n");
  this.assert( completions.length == 2, "should be 2 completions" );
}
*/

exportTests(this);
