Components.utils.import("resource://ubiquity-modules/globals.js");

function CommandManager(cmdSource, msgService) {
  this.__cmdSource = cmdSource;
  this.__msgService = msgService;
  this.__hilitedSuggestion = 0;
  this.__lastInput = "";
  if ( UbiquityGlobals.japaneseMode ) {
    this.__nlParser = new JapaneseNLParser( cmdSource.getAllCommands(),
					    jpGetNounList());
  } else
    this.__nlParser = new NLParser( cmdSource.getAllCommands(),
                                    getNounList());
}

CommandManager.prototype = {
  refresh : function() {
    this.__cmdSource.refresh();
    this.__nlParser.setCommandList( this.__cmdSource.getAllCommands());
    this.__hilitedSuggestion = 0;
    this.__lastInput = "";
  },

  moveIndicationUp : function(context, previewBlock) {
    this.__hilitedSuggestion -= 1;
    if (this.__hilitedSuggestion < 0) {
      this.__hilitedSuggestion = this.__nlParser.getNumSuggestions() - 1;
    }
    this._preview(context, previewBlock);
  },

  moveIndicationDown : function(context, previewBlock) {
    this.__hilitedSuggestion += 1;
    if (this.__hilitedSuggestion > this.__nlParser.getNumSuggestions() - 1) {
      this.__hilitedSuggestion = 0;
    }
    this._preview(context, previewBlock);
  },

  _preview : function(context, previewBlock) {
    var wasPreviewShown = false;
    try {
      wasPreviewShown = this.__nlParser.setPreviewAndSuggestions(context,
								 previewBlock,
								 this.__hilitedSuggestion);
      //dump( "Preview block has been set to: " + $("#cmd-preview").html() + "\n");
    } catch (e) {
      this.__msgService.displayMessage(
        {text: ("An exception occurred while previewing the command '" +
                this.__lastInput + "'."),
         exception: e}
        );
    }
    return wasPreviewShown;
  },

  updateInput : function(input, context, previewBlock) {
    this.__lastInput = input;
    this.__nlParser.updateSuggestionList(input, context);
    this.__hilitedSuggestion = 0;
    if (previewBlock)
      return this._preview(context, previewBlock);
    else
      return false;
  },

  execute : function(context) {
    var parsedSentence = this.__nlParser.getSentence(this.__hilitedSuggestion);
    if (!parsedSentence)
      this.__msgService.displayMessage("No command called " + this.__lastInput + ".");
    else
      try {
        parsedSentence.execute(context);
      } catch (e) {
        this.__msgService.displayMessage(
          {text: ("An exception occurred while running the command '" +
                  this.__lastInput + "'."),
           exception: e}
        );
      }
  },

  getSuggestionListNoInput: function( context ) {
    dump("GetSuggestionListNoInput...\n");
    this.__nlParser.updateSuggestionList("", context);
    return this.__nlParser.getSuggestionList();
  }
};

function CommandSource(codeSources, messageService, sandboxFactory) {
  if (codeSources.length == undefined)
    codeSources = [codeSources];

  if (sandboxFactory == undefined)
    sandboxFactory = new SandboxFactory();
  this._sandboxFactory = sandboxFactory;
  this._codeSources = codeSources;
  this._messageService = messageService;
  this._commands = [];
  this._codeCache = [];
}

CommandSource.prototype = {
  CMD_PREFIX : "cmd_",

  refresh : function() {
    for (var i = 0; i < this._codeSources.length; i++) {
      var code = this._codeSources[i].getCode();
      this._codeCache[i] = code;
    }
    this._loadCommands();
  },

  _loadCommands : function() {
    var sandbox = this._sandboxFactory.makeSandbox();

    var commands = {};

    for (var i = 0; i < this._codeSources.length; i++) {
      var code = this._codeCache[i];

      try {
        this._sandboxFactory.evalInSandbox(code, sandbox);
      } catch (e) {
        this._messageService.displayMessage(
          {text: "An exception occurred while loading code.",
           exception: e}
        );
      }
    }

    var self = this;

    var makeCmdForObj = function(objName) {
      var cmdName = objName.substr(self.CMD_PREFIX.length);
      cmdName = cmdName.replace(/_/g, "-");
      var cmdFunc = sandbox[objName];

      var cmd = {
        name : cmdName,
        execute : function(context, directObject, modifiers) {
          sandbox.context = context;
          return cmdFunc(directObject, modifiers);
        }
      };
      // Attatch optional metadata to command object if it exists
      if (cmdFunc.preview)
        cmd.preview = function(context, directObject, modifiers, previewBlock) {
          sandbox.context = context;
          return cmdFunc.preview(previewBlock, directObject, modifiers);
        };

      if (cmdFunc.DOLabel)
	cmd.DOLabel = cmdFunc.DOLabel;
      else
	cmd.DOLabel = null;
      if (cmdFunc.DOType)
	cmd.DOType = cmdFunc.DOType;
      else
	cmd.DOType = null;
      if (cmdFunc.modifiers)
	cmd.modifiers = cmdFunc.modifiers;
      else
	cmd.modifiers = {};

      return cmd;
    };

    var commandNames = [];

    for (objName in sandbox)
      if (objName.indexOf(this.CMD_PREFIX) == 0) {
        var cmd = makeCmdForObj(objName);
        var icon = sandbox[objName].icon;

        commands[cmd.name] = cmd;
        commandNames.push({name : cmd.name,
                           icon : icon});
      }

    this._commands = commands;
    this.commandNames = commandNames;
  },

  getAllCommands: function() {
    return this._commands;
  },

  getCommand : function(name) {
    if (this._codeCache.length == 0)
      this.refresh();

    if (this._commands[name])
      return this._commands[name];
    else
      return null;
  }
};

function makeDefaultCommandSuggester(commandManager) {

  function getAvailableCommands(context) {
    //dump("GetAvailableCommands...\n");
    var suggestions = commandManager.getSuggestionListNoInput( context );
    //dump("there are " + suggestions.length + " suggestions.\n");
    var retVal = {};
    for (var x in suggestions) {
      var parsedSentence = suggestions[x];
      /*if (window)
	if (window.console)
	  window.console.log(parsedSentence._verb);*/
      retVal[parsedSentence._verb._name] = function() {
	parsedSentence.execute(context);
      };
    }
    return retVal;
  }
  return getAvailableCommands;
}