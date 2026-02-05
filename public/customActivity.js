window.onload = function () {
  const connection = new Postmonger.Session();
  let payload = {};

  connection.trigger("ready");

  connection.on("initActivity", data => payload = data || {});

  connection.on("clickedNext", function () {
    payload.arguments = payload.arguments || {};
    payload.arguments.execute = payload.arguments.execute || {};

    // IMPORTANT: Leave inArguments empty — Journey will inject DE binding itself
    payload.arguments.execute.inArguments = [];

    payload.metaData = payload.metaData || {}; //adding initilization
    payload.metaData.isConfigured = true;
    payload.metaData.label = "Daytime Window";
    payload.name = "Daytime Window";

    connection.trigger("updateActivity", payload);
  });
};




