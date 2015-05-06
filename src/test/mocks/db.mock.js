var Sequelize = require('sequelize'),
    path = require('path'),
    fs = require('fs'),
    storage = path.join(__dirname, 'tmp/sqlite.db'),
    sequelize,
    models = {},
    SaphyreData = require('../../node/provider'),
    saphyreData = new SaphyreData();

if (fs.existsSync(storage)) {
    fs.unlinkSync(storage);
}

sequelize = new Sequelize('test', null, null, {
    dialect : 'sqlite',
    sync : { force : true },
    syncOnAssociation : true,
    logging : false
});

models.Author = sequelize.import(path.join(__dirname, 'models/author.mock'));
models.Article = sequelize.import(path.join(__dirname, 'models/article.mock'));
models.Tag = sequelize.import(path.join(__dirname, 'models/tag.mock'));

models.Author.associate(models);
models.Article.associate(models);

module.exports = {
    sequelize : sequelize,
    models : models,
    data : {
        article : require('./data/article.data.mock')(saphyreData, models),
        author : require('./data/author.data.mock')(saphyreData, models),
        tag : require('./data/tag.data.mock')(saphyreData, models)
    }
};