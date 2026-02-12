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
      {
        country: "{{Event.5b761d4c-323a-6b4d-8d47-6d08b5b2617b.Country}}"
      }
    ];

    // REQUIRED metadata
    payload.metaData = payload.metaData || {};
    payload.metaData.isConfigured = true;
    payload.metaData.label = "Daytime Window";

    payload.name = "Daytime Window";

    connection.trigger("updateActivity", payload);
  });
};






