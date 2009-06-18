// -----------------------------------------------------------------
// TEXT COMMANDS
// -----------------------------------------------------------------

/* TODO there is a lot of duplicated code between these formatting
 * commands... could they be combined?
 */

/* Note that these text formatting commands are a little weird in that
 * they operate on a selection, but they don't take the selection as
 * an argument.  This is as intended, because if there is no text
 * selection, there is nothing for any of these commands to do.
 */
CmdUtils.CreateCommand({
  names: ["bold"],
  description: "If you're in a rich-text-edit area, makes the selected text bold.",
  icon: "chrome://ubiquity/skin/icons/text_bold.png",
  execute: function() {
    var doc = context.focusedWindow.document;

    if (doc.designMode == "on")
      doc.execCommand("bold", false, null);
    else
      displayMessage(_("You're not in a rich text editing field."));
  }
});

CmdUtils.CreateCommand({
  names: ["italicize"],
  description:"If you're in a rich-text-edit area, makes the selected text italic.",
  icon: "chrome://ubiquity/skin/icons/text_italic.png",
  execute: function() {
    var doc = context.focusedWindow.document;

    if (doc.designMode == "on")
      doc.execCommand("italic", false, null);
    else
      displayMessage(_("You're not in a rich text editing field."));
  }
});

CmdUtils.CreateCommand({
  names: ["underline"],
  description:"If you're in a rich-text-edit area, underlines the selected text.",
  icon: "chrome://ubiquity/skin/icons/text_underline.png",
  execute: function() {
    var doc = context.focusedWindow.document;

    if (doc.designMode == "on")
      doc.execCommand("underline", false, null);
    else
      displayMessage(_("You're not in a rich text editing field."));
  }
});

CmdUtils.CreateCommand({
  names: ["highlight", "hilite"],
  description:'Highlights your current selection, like <span style="background: yellow; color: black;">this</span>.',
  icon: "chrome://ubiquity/skin/icons/textfield_rename.png",
  execute: function() {
    var sel = context.focusedWindow.getSelection();
    var document = context.focusedWindow.document;

    if (sel.rangeCount >= 1) {
      var range = sel.getRangeAt(0);
      var newNode = document.createElement("span");
      newNode.style.background = "yellow";
      range.surroundContents(newNode);
    }
  }
});


CmdUtils.CreateCommand({
  names: ["undo (text edit)"],
  description:"Undoes your latest style/formatting or page-editing changes.",
  icon: "chrome://ubiquity/skin/icons/arrow_undo.png",
  execute: function() {
    var doc = context.focusedWindow.document;

    if (doc.designMode == "on")
      doc.execCommand("undo", false, null);
    else
      displayMessage(_("You're not in a rich text editing field."));
  }
});

CmdUtils.CreateCommand({
  names: ["redo (text edit)"],
  description:"Redoes your latest style/formatting or page-editing changes.",
  icon: "chrome://ubiquity/skin/icons/arrow_redo.png",
  execute: function() {
    var doc = context.focusedWindow.document;

    if (doc.designMode == "on")
      doc.execCommand("redo", false, null);
    else
      displayMessage(_("You're not in a rich text editing field."));
  }
});


function wordCount(text){
  var words = text.split(" ");
  var wordCount = 0;

  for(var i=0; i<words.length; i++){
    if (words[i].length > 0)
      wordCount++;
  }

  return wordCount;
}

/* TODO should the object text instead be an "in" argument, as in
 * "count words in this" ?
 */
CmdUtils.CreateCommand({
  names: ["count words", "word count"],
  arguments: {object: noun_arb_text},
  icon: "chrome://ubiquity/skin/icons/sum.png",
  description: "Displays the number of words in a selection.",
  execute: function( args ) {
    var object = args.object;
    if (object.text)
      displayMessage(_("${num} words",{num:wordCount(object.text)}));
    else
      displayMessage(_("No words selected."));
  },
  preview: function(pBlock, args) {
    var object = args.object;
    if (object.text)
      pBlock.innerHTML = _("${num} words",{num:wordCount(object.text)});
    else
      pBlock.innerHTML = _("Displays the number of words in a selection.");
  }
});

/* TODO the dummy argument "wikipedia" could become a plugin argument
 * and this command could become a general purpose "insert link"
 * command.
 */
CmdUtils.CreateCommand(
{
  names: ["link (to wikipedia)",
          "insert link (to wikipedia)",
          "linkify (to wikipedia)"],
  arguments: [{role: "object",
               nountype: noun_arb_text,
               label: "phrase"},
              {role: "goal",
               nountype: ["wikipedia"],
               label: "wikipedia"},
              {role: "format",
               nountype:noun_type_lang_wikipedia,
               label: "language"}],
  description: "Turns a phrase into a link to the matching Wikipedia article.",
  icon: "http://www.wikipedia.org/favicon.ico",
  _link: function({object: {text, html}, format: {data}}){
    var url = ("http://" + (data || "en") +
               ".wikipedia.org/wiki/Special%3ASearch/" +
               encodeURIComponent(text.replace(/ /g, "_")));
    return ['<a href="' + url + '">' + html + "</a>", url];
  },
  execute: function(args) {
    var [htm, url] = this._link(args);
    CmdUtils.setSelection(htm, {text: url});
  },
  preview: function(pbl, args) {
    var [htm, url] = this._link(args);
    pbl.innerHTML = (this.description +
                     "<p>" + htm + "</p>" +
                     <code>{url}</code>.toXMLString());
  }
});


// -----------------------------------------------------------------
// CALCULATE COMMANDS
// -----------------------------------------------------------------

CmdUtils.CreateCommand({
  names: ["calculate"],
  arguments: {object: /^[\d.+\-*\/^%~(, )]+$/},
  icon: "chrome://ubiquity/skin/icons/calculator.png",
  description: "Calculates the value of a mathematical expression.",
  help: "Try it out: issue &quot;calc 22/7 - 1&quot;.",
  preview: function(previewBlock, args) {
    var expression = args.object.text;

    if(expression.length < 1) {
      previewBlock.innerHTML = _("Calculates an expression. E.g., 22/7.");
      return;
    }

    var result = "?";
    var error = null;
    try {
      var parser = new MathParser();

      result = parser.parse(expression);

      if(isNaN(result))
        throw new Error("Invalid expression");
    } catch(e) {
      error = e.message;
      result = "?";
    }
    var previewData = {
      "expression": expression,
      "result": result,
      "error": error
    };
    previewBlock.innerHTML = _("${expression} = <b>${result}</b>{if error}<p><b>Error:</b> ${error}</p>{/if}", previewData);
  },

  execute: function( args ) {
    var expression = args.object.text;

    if(expression.length < 1) {
      displayMessage(_("Requires a expression."));
      return;
    }

    try {
      var parser = new MathParser();
      var result = parser.parse(expression) + "";

      if(isNaN(result))
        throw new Error(_("Invalid expression"));

      CmdUtils.setSelection(result);
      CmdUtils.setLastResult(result);
    } catch(e) {
      displayMessage(_("Error calculating expression: ${expression}",{expression:expression}));
    }
  }
});

//+ Carlos R. L. Rodrigues
//@ http://jsfromhell.com/classes/math-parser [rev. #2]
MathParser = function(){
  var o = this, p = o.operator = {};
  p["+"] = function(n, m){return n + m;};
  p["-"] = function(n, m){return n - m;};
  p["*"] = function(n, m){return n * m;};
  p["/"] = function(m, n){return n / m;};
  p["%"] = function(m, n){return n % m;};
  p["^"] = function(m, n){return Math.pow(n, m);};
  p["~"] = function(m, n){return Math.sqrt(n, m);};
  o.custom = {}, p.f = function(s, n){
    if(Math[s]) return Math[s](n);
    else if(o.custom[s]) return o.custom[s].apply(o, n);
    else throw new Error("Function \"" + s + "\" not defined.");
  }, o.add = function(n, f){this.custom[n] = f;}
};
MathParser.prototype.eval = function(e){
  var e = e.split(""), v = [], p = [], a, c = 0, s = 0, x, t, d = 0;
  var n = "0123456789.", o = "+-*/^%~", f = this.operator;
  for(var i = 0, l = e.length; i < l; i++)
    if(o.indexOf(e[i]) > -1)
      e[i] == "-" && (s > 1 || !d) && ++s, !s && d && (p.push(e[i]), s = 2), "+-".indexOf(e[i]) < (d = 0) && (c = 1);
    else if(a = n.indexOf(e[i]) + 1 ? e[i++] : ""){
      while(n.indexOf(e[i]) + 1) a += e[i++];
      v.push(d = (s & 1 ? -1 : 1) * a), c && v.push(f[p.pop()](v.pop(), v.pop())) && (c = 0), --i, s = 0;
    }
  for(c = v[0], i = 0, l = p.length; l--; c = f[p[i]](c, v[++i]));
  return c;
};
MathParser.prototype.parse = function(e){
  var p = [], f = [], ag, n, c, a, o = this, v = "0123456789.+-*/^%~(, )";
  for(var x, i = 0, l = e.length; i < l; i++){
    if(v.indexOf(c = e.charAt(i)) < 0){
      for(a = c; v.indexOf(c = e.charAt(++i)) < 0; a += c); f.push((--i, a));
    }
    else if(!(c == "(" && p.push(i)) && c == ")"){
      if(a = e.slice(0, (n = p.pop()) - (x = v.indexOf(e.charAt(n - 1)) < 0 ? y = (c = f.pop()).length : 0)), x)
        for(var j = (ag = e.slice(n, ++i).split(",")).length; j--; ag[j] = o.eval(ag[j]));
      l = (e = a + (x ? o.operator.f(c, ag) : o.eval(e.slice(n, ++i))) + e.slice(i)).length, i -= i - n + c.length;
    }
  }
  return o.eval(e);
};

CmdUtils.CreateCommand(
  {
    names: ["gcalculate"],
    arguments: [{role: "object",
                 nountype: noun_arb_text,
                 label: "expression"}],
    description: "Calculate knows many functions, constants, units, currencies, etc.",
    help: "Try 5% of 700,  sin( sqrt( ln(pi))),  (1+i)^3,  15 mod 9, (5 choose 2) / 3!,  speed of light in miles per hour,  3 dollars in euros,  242 in hex, MCMXVI in decimal.",

    icon: "chrome://ubiquity/skin/icons/calculator.png",

    author: { name: "Axel Boldt", email: "axelboldt@yahoo.com"},
    homepage: "http://math-www.uni-paderborn.de/~axel/",
    license: "Public domain",

    // URL of Google page to which expression is to be appended. We want only 1 result.
    _google_url: "http://www.google.com/search?hl=en&num=1&q=",

    // Regular expression that matches a Google result page iff it is a calculator result;
    // first subexpression matches the actual result
    _calc_regexp: /\/calc_img\.gif.*?<b>(.*?)<\/b>/i,

    execute: function( {object} ) {
      var expression = object.text;
      var url = this._google_url + encodeURIComponent(expression);
      Utils.openUrlInBrowser( url );
    },

    preview: function( pblock, {object} ) {

      // link to calculator help
      var calc_help = _("Examples: 3^4/sqrt(2)-pi,&nbsp;&nbsp;3 inch in cm,&nbsp;&nbsp; speed of light,&nbsp;&nbsp; 0xAF in decimal<br><u><a href=\"http://www.googleguide.com/calculator.html\">(Command List)</a></u>");

      var expression = object.text;
      var cmd = this;

      pblock.innerHTML = calc_help;

      jQuery.get( this._google_url + encodeURIComponent(expression), {},
         function( result_page ) {
           var matchresult = result_page.match(cmd._calc_regexp);
           if (matchresult) {
              pblock.innerHTML = "<h2>" + matchresult[1] + "</h2>" + calc_help;
           } else {
              pblock.innerHTML = calc_help;
           }
       });
      }
  })



// -----------------------------------------------------------------
// SPARKLINE
// -----------------------------------------------------------------

function sparkline(data) {
  var p = data;

  var nw = "auto";
  var nh = "auto";


  var f = 2;
  var w = ( nw == "auto" || nw == 0 ? p.length * f : nw - 0 );
  var h = ( nh == "auto" || nh == 0 ? "1em" : nh );

  var doc = context.focusedWindow.document;
  var co = doc.createElement("canvas");

  co.style.height = h;
  co.style.width = w;
  co.width = w;

  var h = co.offsetHeight;
  h = 10;
  co.height = h;

  var min = 9999;
  var max = -1;

  for ( var i = 0; i < p.length; i++ ) {
    p[i] = p[i] - 0;
    if ( p[i] < min ) min = p[i];
    if ( p[i] > max ) max = p[i];
  }

  if ( co.getContext ) {
    var c = co.getContext("2d");
    c.strokeStyle = "red";
    c.lineWidth = 1.0;
    c.beginPath();

    for ( var i = 0; i < p.length; i++ ) {
      c.lineTo( (w / p.length) * i, h - (((p[i] - min) / (max - min)) * h) );
    }

    c.stroke();
  }

  return co.toDataURL();
}

CmdUtils.CreateCommand({
  names: ["sparkline", "graph", "insert sparkline"],
  description: "Graphs the current selection, turning it into a sparkline.",
  arguments: [{role: "object",
               nountype: noun_arb_text,
               label: "data"}],
  author: {name: "Aza Raskin", email:"aza@mozilla.com"},
  license: "MIT",
  help: "Select a set of numbers -- in a table or otherwise -- and use this command to graph them as a sparkline. Don't worry about non-numbers getting in there. It'll handle them.",

  _cleanData: function( string ) {
    var dirtyData = string.split(/\W/);
    var data = [];
    for(var i=0; i<dirtyData.length; i++){
      var datum = parseFloat( dirtyData[i] );
      if( datum.toString() != "NaN" ){
        data.push( datum );
      }
    }

    return data;
  },

  _dataToSparkline: function( string ) {
    var data = this._cleanData( string );
    if( data.length < 2 ) return null;

    var dataUrl = sparkline( data );
    return img = "<img src='%'/>".replace(/%/, dataUrl);
  },

  preview: function(pblock, {object}) {
    var img = this._dataToSparkline( object.text );

    if( !img )
      jQuery(pblock).text( _("Requires numbers to graph.") );
    else
      jQuery(pblock).empty().append( img ).height( "15px" );
  },

  execute: function( {object} ) {
    var img = this._dataToSparkline( object.text );
    if( img ) CmdUtils.setSelection( img );
  }
});

// -----------------------------------------------------------------
// TRANSLATE COMMANDS
// -----------------------------------------------------------------

function translateTo(text, langCodePair, callback, pblock) {
  var url = "http://ajax.googleapis.com/ajax/services/language/translate";
  var params = {
    v: "1.0",
    q: text,
    langpair: (langCodePair.from || "") + "|" + (langCodePair.to || ""),
  };
  function onsuccess(data) {

    // The usefulness of this command is limited because of the
    // length restriction enforced by Google. A better way to do
    // this would be to split up the request into multiple chunks.
    // The other method is to contact Google and get a special
    // account.
    try {
      var {translatedText} = data.responseData;
    } catch(e) {
      // If we get either of these error messages, that means Google wasn't
      // able to guess the originating language. Let's assume it was English.
      // TODO: Localize this.
      var BAD_FROM_LANG_1 = _("invalid translation language pair");
      var BAD_FROM_LANG_2 = _("could not reliably detect source language");
      var errMsg = data.responseDetails;
      if( errMsg == BAD_FROM_LANG_1 || errMsg == BAD_FROM_LANG_2 ) {
        // Don't do infinite loops. If we already have a guess language
        // that matches the current forced from language, abort!
        if( langCodePair.from != "en" )
          translateTo(text, {from: "en", to: langCodePair.to},
                      callback, pblock);
      }
      else {
        displayMessage( _("Translation Error: ${error}",
                          {error:data.responseDetails}) );
      }
      return;
    }
    callback(translatedText);
  }

  if (pblock) CmdUtils.previewGet(pblock, url, params, onsuccess, "json");
  else jQuery.get(url, params, onsuccess, "json");
}

CmdUtils.CreateCommand({
  DEFAULT_LANG_PREF : "extensions.ubiquity.default_translation_lang",
  names: ["translate"],
  /*
    da: ["oversat"],
    fr: ["traduire","traduizez","traduis"],
    ca: ["tradueix", "traduix"],
    da: ["oversat"],
    sv: ["oversatt"],
    ja: ["訳す", "訳せ", "訳して", "やくす", "やくせ", "やくして"],
    pt: ["traduzir", "traduza"],
   */
  arguments: [
    {role: "object", nountype: noun_arb_text, label: "text"},
    {role: "source", nountype: noun_type_lang_google},
    {role: "goal", nountype: noun_type_lang_google}
  ],
  description: "Translates from one language to another.",
  icon: "http://www.google.com/favicon.ico",
  help: "" + (
    <>You can specify the language to translate to,
    and the language to translate from.
    For example, try issuing "translate mother from english to chinese".
    If you leave out the languages, it will try to guess what you want.
    It works on selected text in any web page,
    but there&#39;s a limit (a couple of paragraphs)
    to how much it can translate a selection at once.
    If you want to translate a lot of text, leave out the input and
    it will translate the whole page.</>),
//  takes: {text: noun_arb_text},
//  modifiers: {to: noun_type_lang_google, from: noun_type_lang_google},
  execute: function({object, goal, source}) {
    var sl = source ? source.data : '';
    var tl = goal && goal.data || this._getDefaultLang();
    if (object.text)
      translateTo(object.text,
                  {from: sl, to: tl},
                  function(translation) {
                    CmdUtils.setSelection(translation);
                  });
    else
      Utils.openUrlInBrowser(
        "http://translate.google.com/translate" +
        Utils.paramsToString({
          u: context.focusedWindow.location.href,
          sl: sl,
          tl: tl,
        }));
  },
  preview: function(pblock, args) {
    var {object, goal, source} = args;
    var textToTranslate = object && object.text;
    var defaultLang = this._getDefaultLang();
    var toLang = (goal && goal.text ||
                  noun_type_lang_google.getLangName(defaultLang));
    var toLangCode = goal && goal.data || defaultLang;
    var fromLangCode = source ? source.data : '';
    if (!textToTranslate) {
      var {href} = context.focusedWindow.location;
      pblock.innerHTML = (<>Translates <a href={href}
                          >{href}</a> to <b>{toLang}</b> translation.</>);
      return;
    }
    var html = (_("Replaces the selected text with the <b>${toLang}</b> translation:",
                 {toLang:toLang}) );
    pblock.innerHTML = html;
    translateTo(
      textToTranslate,
      {from: fromLangCode, to: toLangCode},
      function(translation) {
        pblock.innerHTML = html + <p><b>{translation}</b></p>;
      },
      pblock);
  },
  // Returns the default language for translation.  order of defaults:
  // extensions.ubiquity.default_translation_lang > general.useragent.locale > "en"
  // And also, if there unknown language code is found any of these preference,
  // we fall back to English.
  _getDefaultLang: function() {
    var {prefs} = Application;
    var userLocale = prefs.getValue("general.useragent.locale", "en");
    var defaultLang = prefs.getValue(this.DEFAULT_LANG_PREF, userLocale);
    // If defaultLang is invalid lang code, fall back to english.
    if (!noun_type_lang_google.getLangName(defaultLang)) {
      return "en";
    }
    return defaultLang;
  }
});

// -----------------------------------------------------------------
// COMMANDS THAT CREATE NEW COMMANDS
// -----------------------------------------------------------------

/* TODO: This command should take another optional argument to
 * provides an alternate name for the new command. */

/* TODO combine both of these into a single command with a provider
 * plugin?  i.e. "create command using/with/from bookmarklet",
 * "create command using/with/from search box"
 */
CmdUtils.CreateCommand({
  names: ["create bookmarklet command"],
  arguments: [{role: "source",
               nountype: noun_type_bookmarklet,
               label: "bookmarklet name"}],
  description: "Creates a new command from a bookmarklet.",
  author: {name: "Abimanyu Raja", email: "abimanyuraja@gmail.com"},
  license: "MPL",
  preview: function(previewBlock, {source: {text, data}}) {
    previewBlock.innerHTML = (
      data
      ? (<>Creates a new command called
         <b>{this._formatName(text)}</b> that runs the following bookmarklet:
         <pre style="white-space:pre-wrap">{decodeURI(data)}</pre></>)
      : this.description);
  },
  execute: function({source}) {
    var name = this._formatName(source.text);
    var url = source.data;

    //build the piece of code that creates the command
    var code =  [
      "// generated by " + this.name,
      "CmdUtils.makeBookmarkletCommand({",
      "  name: " + uneval(name) + ",",
      "  url: " + uneval(url) + ",",
      "});\n\n",
      ].join("\n");

    //prepend the code to Ubiqity's command editor
    CmdUtils.UserCode.prependCode(code);

    tellTheUserWeFinished(name);
  },
  _formatName: function(n) n.toLowerCase(),
});

CmdUtils.CreateCommand(
{
  names: ["create search command"],
  description: "Creates a new Ubiquity command from a focused search-box.",
  help: (<ol style="list-style-image:none">
         <li>Select a searchbox.</li>
         <li>Execute this command to create the new search command.</li>
         </ol>) + "",
  author: {name: "Marcello Herreshoff",
           homepage: "http://stanford.edu/~marce110/"},
  contributors: ["Abimanyu Raja", "satyr"],
  icon: "chrome://ubiquity/skin/icons/search.png",
  license: "GPL/LGPL/MPL",
  homepage:
  "http://stanford.edu/~marce110/verbs/new-command-from-search-box.html",
  arguments: [{role: "object",
               nountype: noun_arb_text,
               label: "command name"}],
  preview: function(pblock, {object: {text}}) {
    pblock.innerHTML = (
      text
      ? _("Creates a new search command called <b>${text}</b>",{text:text})
      : this.description + this.help);
  },
  execute: function({object: {text: name}}) {
    var node = context.focusedElement || 0;
    var {form} = node;
    if (!node || !form) {
      displayMessage(
        _("You need to focus a searchbox before running this command."));
      return;
    }
    //1. Figure out what this searchbox does.
    const PLACEHOLDER = "{QUERY}";
    var formData = [];
    Array.forEach(form.elements, function(el) {
      if (!el.type) return; // happens with fieldsets
      if (el == node) {
        formData.push(this._encodePair(el.name, "") + PLACEHOLDER);
        return;
      }
      var type = el.type.toLowerCase();
      if (/^(?:text(?:area)?|hidden)$/.test(type) ||
          /^(?:checkbox|radio)$/.test(type) && el.checked)
        formData.push(this._encodePair(el.name, el.value));
      else if (/^select-(?:one|multiple)$/.test(type))
        Array.forEach(el.options, function(o) {
          if (o.selected)
            formData.push(this._encodePair(el.name, o.value));
        }, this);
    }, this);
    var doc = node.ownerDocument;
    var uri = Utils.url({uri: form.getAttribute("action"), base: doc.URL});
    var url = uri.spec;
    var data = formData.join("&");
    var post = form.method.toUpperCase() === "POST";
    if (!post) url += "?" + data;

    //2. Generate the name if not specified.
    if (!name) name = uri.host || doc.title;

    //3. Build the piece of code that creates the command
    var codes = [];
    codes.push(
      '// generated by ' + this.name,
      'CmdUtils.makeSearchCommand({',
      '  name: ' + uneval(name) + ',',
      '  url: ' + uneval(url) + ',');
    post && codes.push(
      '  postData: ' + uneval(data) + ',');
    codes.push(
      '});\n\n');

    //4. Prepend the code to command-editor
    CmdUtils.UserCode.prependCode(codes.join("\n"));

    //5. Tell the user we finished
    tellTheUserWeFinished(name);
  },
  _encodePair: function(key, val)(encodeURIComponent(key) + "=" +
                                  encodeURIComponent(val)),
});

function tellTheUserWeFinished(name) {
  displayMessage(_("You have created the command: ${name}. You can edit its source-code with the command-editor command.",{name:name}));
}
