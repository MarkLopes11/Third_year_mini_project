/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("iy1whj0bkeo9936")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "lwtkq8wj",
    "name": "video_summary",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("iy1whj0bkeo9936")

  // remove
  collection.schema.removeField("lwtkq8wj")

  return dao.saveCollection(collection)
})
