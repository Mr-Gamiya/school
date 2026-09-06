/* SmtpJS.com - v3.0.0 - https://smtpjs.com */
var Email = {
  send: function (a) {
    return new Promise(function (n, e) {
      a.nocache = Math.floor(1e6 * Math.random() + 1),
        a.Action = "Send";
      var t = JSON.stringify(a);
      Email.ajaxPost("https://smtpjs.com/v3/smtpjs.aspx?", t, function (e) {
        n(e);
      });
    });
  },
  ajaxPost: function (e, n, t) {
    var a = Email.createCORSRequest("POST", e);
    a.timeout = 30000;
    a.setRequestHeader("Content-type", "application/x-www-form-urlencoded"),
      (a.onload = function () {
        var e = a.responseText;
        null != t && t(e);
      }),
      (a.onerror = function () {
        null != t && t("NETWORK ERROR: could not reach the SMTP relay");
      }),
      (a.ontimeout = function () {
        null != t && t("NETWORK TIMEOUT: the SMTP relay did not respond");
      }),
      a.send(n);
  },
  ajax: function (e, n) {
    var t = Email.createCORSRequest("GET", e);
    (t.onload = function () {
      var e = t.responseText;
      null != n && n(e);
    }),
      t.send();
  },
  createCORSRequest: function (e, n) {
    var t = new XMLHttpRequest();
    return "withCredentials" in t
      ? (t.open(e, n, !0), t)
      : "undefined" != typeof XDomainRequest
      ? ((t = new XDomainRequest()), t.open(e, n), t)
      : null;
  }
};