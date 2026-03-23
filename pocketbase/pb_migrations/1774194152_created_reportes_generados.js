/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id != ''",
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_3556118385",
        "hidden": false,
        "id": "relation251979018",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "generado_por",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "select372388788",
        "maxSelect": 1,
        "name": "tipo_reporte",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "REPORTE_DIARIO",
          "ENTREGA_DIARIA"
        ]
      },
      {
        "hidden": false,
        "id": "date1160533315",
        "max": "",
        "min": "",
        "name": "fecha_reporte",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "autodate4132279665",
        "name": "fecha_generacion",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "number1532381129",
        "max": null,
        "min": null,
        "name": "total_registros",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "select714859217",
        "maxSelect": 1,
        "name": "sede",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "Puno",
          "Juliaca",
          "Ambas"
        ]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2709936887",
        "max": 0,
        "min": 0,
        "name": "hash_verificacion",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      }
    ],
    "id": "pbc_653606244",
    "indexes": [],
    "listRule": "@request.auth.id != ''",
    "name": "reportes_generados",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": "@request.auth.id != ''"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_653606244");

  return app.delete(collection);
})
