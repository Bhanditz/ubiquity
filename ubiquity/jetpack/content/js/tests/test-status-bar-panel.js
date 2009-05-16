var StatusBarPanelTests = {
  testStatusBarWorks: function(self) {
    var browserCount = 0;
    var bw = new BrowserWatcher(
      {onLoad: function(window) {
         if (!window.document.getElementById("status-bar").hidden)
           browserCount += 1;
       }}
    );
    bw.unload();
    bw = null;

    if (browserCount) {
      // iframes take a while to GC even when we force GC for some
      // reason, so we'll add a margin of error for the memory
      // tracking.
      self.allowForMemoryError(browserCount);
      var sb = new StatusBar();
      function onDone() {
        browserCount -= 1;
        if (browserCount == 0) {
          sb.unload();
          sb = null;
          self.success();
        }
      }
      sb.append(
        {html: "<p>testing</p>",
         onLoad: function(document) {
           window.setTimeout(onDone, 0);
         }});
      self.setTimeout(5000);
    }
  }
};