window.onload = function () {
  const connection = new Postmonger.Session();
  let payload = {};

  connection.trigger("ready");

  connection.on("initActivity", data => {
    payload = data || {};
  });

  connection.on("clickedNext", function () {
    payload.arguments = payload.arguments || {};
    payload.arguments.execute = payload.arguments.execute || {};

    // REQUIRED inArguments (must exist)
    payload.arguments.execute.inArguments = [
      { country: "india" }
    ];


    // REQUIRED metadata
    payload.metaData = payload.metaData || {};
    payload.metaData.isConfigured = true;
    payload.metaData.label = "Daytime Window";

    payload.name = "Daytime Window";

    connection.trigger("updateActivity", payload);
  });
};


