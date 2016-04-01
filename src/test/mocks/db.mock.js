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

sequelize = new Sequelize(process.env.DBNAME, process.env.USER, process.env.PASS, {
    dialect : process.env.DIALECT || 'sqlite',
    sync : { force : true },
    dialectOptions : { socketPath : process.env.SOCKET },
    syncOnAssociation : true,
    host : process.env.DBHOST,
    port : process.env.DBPORT,
    logging : process.env.DEBUG ? console.log : false
});

models.Author = sequelize.import(path.join(__dirname, 'models/author.mock'));
models.Article = sequelize.import(path.join(__dirname, 'models/article.mock'));
models.Tag = sequelize.import(path.join(__dirname, 'models/tag.mock'));
models.ArticleInfo = sequelize.import(path.join(__dirname, 'models/article.info.mock'));
models.User = sequelize.import(path.join(__dirname, 'models/user.mock'));
models.ArticleViewModel = sequelize.import(path.join(__dirname, 'models/article.view.mock'));

models.Author.associate(models);
models.Article.associate(models);
models.ArticleInfo.associate(models);
models.ArticleViewModel.associate(models);

module.exports = {
    sequelize : sequelize,
    models : models,
    data : {
        article : require('./data/article.data.mock')(saphyreData, models),
        author : require('./data/author.data.mock')(saphyreData, models),
        tag : require('./data/tag.data.mock')(saphyreData, models)
    }
};