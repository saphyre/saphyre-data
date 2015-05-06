module.exports = function (saphyreData, models) {

    var Article = models.Article,
        model = saphyreData.createModel(Article);

    model.projection('all', {
        'article_id' : 'id',
        'title' : 'title',
        'content' : 'content',
        'Author.author_id' : 'author.id',
        'Author.name' : 'author.name',
        'Tags' : 'tags'
    });

    model.projection('list', {
        'article_id' : 'id',
        'title' : 'title',
        'date' : 'date'
    }).use(function (article) {
        article.title = article.title.toUpperCase();
    });

    model.criteria('id', {
        name : 'id',
        property : 'article_id',
        operator : saphyreData.OPERATOR.EQUAL
    });

    return model;

};