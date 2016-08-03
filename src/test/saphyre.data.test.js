var chai   = require('chai'),
    expect = chai.expect,
    mock = require('./mocks/db.mock');

describe('this test', function () {
    it('should have 6 models', function () {
        expect(mock.models).to.have.property('Author');
        expect(mock.models).to.have.property('Article');
        expect(mock.models).to.have.property('ArticleInfo');
        expect(mock.models).to.have.property('Tag');
        expect(mock.models).to.have.property('User');
        expect(mock.models).to.have.property('ArticleViewModel');
    });

    it('should create sequelize instance and connect', () => {
        return mock.sequelize.sync();
    });
});

describe('saphyre data', function () {

    beforeEach(function (done) {
        mock.sequelize.sync().then(function () {
            done();
        }).catch(done);
    });

    afterEach(function () {
        var tagData = mock.data.tag;
        delete tagData.cache;
    });

    it('should get projection', function () {
        var articleData = mock.data.article,
            projection = articleData.getProjection('list');

        expect(projection).to.exist;
        expect(projection).to.have.property('config');
        expect(projection).to.have.property('middlewares');
    });

    it('should return a page', () => {
        var Article = mock.models.Article,
            articleData = mock.data.article;

        return Article.create({
            title : 'this is a title example',
            content : 'this is the article content',
            active : true
        }).then(function () {
            return articleData.requestList({
                projection : 'list',
                page : 1,
                pageSize : 10
            });
        }).then(function (result) {
            expect(result).to.have.property('page').equal(1);
            expect(result).to.have.property('pages').equal(1);
            expect(result).to.have.property('count').equal(1);
            expect(result).to.have.property('list').with.length(1);
            expect(result.list[0]).to.have.property('id');
            expect(result.list[0]).to.have.property('title').equal('THIS IS A TITLE EXAMPLE');
            expect(result.list[0]).to.have.property('date');
            expect(result.list[0]).to.have.property('active').equal(true);

            return Article.create({
                title : 'this is another title example',
                content : 'this is the article content',
                active : false
            });
        }).then(function () {
            return articleData.requestList({
                projection : 'list',
                page : 2,
                pageSize : 1
            });
        }).then(function (result) {
            expect(result).to.have.property('page').equal(2);
            expect(result).to.have.property('pages').equal(2);
            expect(result).to.have.property('count').equal(2);
            expect(result).to.have.property('list').with.length(1);
            expect(result.list[0]).to.have.property('id');
            expect(result.list[0]).to.have.property('title').equal('THIS IS ANOTHER TITLE EXAMPLE');
            expect(result.list[0]).to.have.property('date');
            expect(result.list[0]).to.have.property('active').equal(false);
        });
    });

    it('should return a single row', () => {
        var Article = mock.models.Article,
            articleData = mock.data.article;

        return Article.create({
            title : 'this is a title example',
            content : 'this is the article content'
        }).then(function () {
            return articleData.single({
                projection : 'list'
            });
        }).then(function (article) {
            expect(article).to.have.property('id');
            expect(article).to.have.property('title').equal('THIS IS A TITLE EXAMPLE');
            expect(article).to.have.property('date');
        });
    });

    it('should return a list', () => {
        var Article = mock.models.Article,
            articleData = mock.data.article;

        return Article.create({
            title : 'this is a title example',
            content : 'this is the article content'
        }).then(function () {
            return articleData.list({
                projection : 'list'
            });
        }).then(function (list) {
            expect(list).to.have.length(1);
        });
    });

    it('should cache', () => {
        var Tag = mock.models.Tag,
            tagData = mock.data.tag;

        expect(tagData.cache).to.not.exist;

        return Tag.bulkCreate([
            { name : 'one' },
            { name : 'another' }
        ]).then(function () {
            return tagData.list();
        }).then(function (list) {
            expect(tagData.cache).to.exist;
            expect(tagData.cache).to.have.property('timestamp');
            expect(tagData.cache).to.have.property('result').to.be.equal(list);

            var timestamp = tagData.cache.timestamp;
            return tagData.list().then(function () {
                expect(tagData.cache).to.exist;
                expect(tagData.cache).to.have.property('timestamp').equal(timestamp);
            });
        });
    });

    it('shouldn`t cache', () => {
        var Tag = mock.models.Tag,
            tagData = mock.data.tag;

        expect(tagData.cache).to.not.exist;

        return Tag.bulkCreate([
            { name : 'one' },
            { name : 'another' }
        ]).then(function () {
            return tagData.list({
                cached : false
            });
        }).then(function () {
            expect(tagData.cache).to.not.exist;

            return tagData.requestList({
                cached : false,
                pageSize : 10
            });
        }).then(function () {
            expect(tagData.cache).to.not.exist;
        });
    });

    it('should handle cached data', () => {
        var Article = mock.models.Article,
            Author = mock.models.Author,
            Tag = mock.models.Tag,
            articleData = mock.data.article;

        return Tag.bulkCreate([
            { name : 'one' },
            { name : 'another' }
        ]).then(function () {
            return Author.create({
                name : 'the author'
            });
        }).then(function (author) {
            return Article.create({
                title : 'this is a title example',
                content : 'this is the article content',
                author_id : author.author_id
            });
        }).then(function (article) {
            return Tag.findAll().then(function (tags) {
                return article.setTags(tags);
            });
        }).then(function () {
            return articleData.single({
                projection : 'all'
            });
        }).then(function (article) {
            expect(article).to.have.property('id');
            expect(article).to.have.property('title').equal('this is a title example');
            expect(article).to.have.property('author').to.have.property('name').equal('the author');
            expect(article).to.have.property('tags').with.length(2);
            expect(article.tags[0]).to.have.property('name').equal('one');
            expect(article.tags[1]).to.have.property('name').equal('another');
        });
    });

    it('should handle cached data in sublists', () => {
        var Article = mock.models.Article,
            Author = mock.models.Author,
            Tag = mock.models.Tag,
            authorData = mock.data.author;

        return Tag.bulkCreate([
            { name : 'one' },
            { name : 'another' }
        ]).then(function () {
            return Author.create({
                name : 'the author'
            });
        }).then(function (author) {
            return Article.bulkCreate([
                {
                    title : 'this is a title example',
                    content : 'this is the article content',
                    author_id : author.author_id
                },
                {
                    title : 'this is another title example',
                    content : 'this is another article content',
                    author_id : author.author_id
                }
            ]);
        }).then(function () {
            return Article.findById(1);
        }).then(function (article) {
            return Tag.findAll().then(function (tags) {
                return article.setTags(tags);
            });
        }).then(function () {
            return authorData.single({
                projection : 'all'
            });
        }).then(function (author) {
            expect(author).to.have.property('id');
            expect(author).to.have.property('name').equal('the author');
            expect(author).to.have.property('articles').with.length(2);
            expect(author.articles[0]).to.have.property('id');
            expect(author.articles[0]).to.have.property('title').equal('this is a title example');
            expect(author.articles[0]).to.have.property('tags').with.length(2);
            expect(author.articles[0].tags[0]).to.have.property('name').equal('one');
            expect(author.articles[0].tags[1]).to.have.property('name').equal('another');

            expect(author.articles[1]).to.have.property('id');
            expect(author.articles[1]).to.have.property('title').equal('this is another title example');
            expect(author.articles[1]).to.have.property('tags').with.length(0);
        });
    });

    it('should handle cached data in sublists, even when there`s none', () => {
        var Article = mock.models.Article,
            Author = mock.models.Author,
            authorData = mock.data.author;

        return Author.create({
            name : 'the author'
        }).then(function (author) {
            return Article.create({
                title : 'this is a title example',
                content : 'this is the article content',
                author_id : author.author_id
            });
        }).then(function () {
            return authorData.single({
                projection : 'all'
            });
        }).then(function (author) {
            expect(author).to.have.property('id');
            expect(author).to.have.property('name').equal('the author');
            expect(author).to.have.property('articles').with.length(1);
            expect(author.articles[0]).to.have.property('id');
            expect(author.articles[0]).to.have.property('title').equal('this is a title example');
            expect(author.articles[0]).to.have.property('tags').with.length(0);
        });
    });

    it('should handle lists in sublists', () => {
        var Article = mock.models.Article,
            Author = mock.models.Author,
            Tag = mock.models.Tag,
            authorData = mock.data.author,
            author_id;

        return Tag.bulkCreate([
            { name : 'one' },
            { name : 'another' }
        ]).then(function () {
            return Author.create({
                name : 'the author'
            });
        }).then(function (author) {
            author_id = author.author_id;

            return Article.create({
                title : 'this is a title example',
                content : 'this is the article content',
                author_id : author_id
            });
        }).then(function (article) {
            return Tag.findAll().then(function (tags) {
                return article.setTags(tags);
            });
        }).then(function () {
            return Article.create({
                title : 'this is another title example',
                content : 'this is the article content',
                author_id : author_id
            });
        }).then(function (article) {
            return Tag.findAll().then(function (tags) {
                return article.setTags(tags);
            });
        }).then(function () {
            return authorData.single({
                projection : 'article-tags'
            });
        }).then(function (author) {
            expect(author).to.have.property('id');
            expect(author).to.have.property('name').equal('the author');
            expect(author).to.have.property('articleTags').with.length(2);
            expect(author.articleTags[0]).to.have.property('id');
            expect(author.articleTags[0]).to.have.property('name').equal('one');
            expect(author.articleTags[1]).to.have.property('name').equal('another');
        });
    });

    it('should return no rows in sublists when there`s none', () => {
        var Author = mock.models.Author,
            Tag = mock.models.Tag,
            authorData = mock.data.author;

        return Tag.bulkCreate([
            { name : 'one' },
            { name : 'another' }
        ]).then(function () {
            return Author.create({
                name : 'the author'
            });
        }).then(function () {
            return authorData.single({
                projection : 'all'
            });
        }).then(function (author) {
            expect(author).to.have.property('id');
            expect(author).to.have.property('name').equal('the author');
            expect(author).to.have.property('articles').with.length(0);
        });
    });

    it('should return no rows in sublists when there`s none, on belongsToMany assoc', () => {
        var Author = mock.models.Author,
            Article = mock.models.Article,
            articleData = mock.data.article;

        return Author.create({ name : 'the author' }).then(function (author) {
            return Article.create({
                title : 'this is a title example',
                content : 'this is the article content',
                author_id : author.author_id
            });
        }).then(function () {
            return articleData.single({
                projection : 'tags-no-cache'
            });
        }).then(function (article) {
            expect(article).to.have.property('id');
            expect(article).to.have.property('title').equal('this is a title example');
            expect(article).to.have.property('tags').with.length(0);
        });
    });

    it('should filter data using criterias', () => {
        var Article = mock.models.Article,
            articleData = mock.data.article;

        return Article.create({
            title : 'this is a title example',
            content : 'this is the article content'
        }).then(function (article) {
            return articleData.single({
                projection : 'list',
                criteria : {
                    id : { id : article.article_id }
                }
            });
        }).then(function (article) {
            expect(article).to.exist.have.property('id');
            expect(article).to.have.property('title').equal('THIS IS A TITLE EXAMPLE');
            expect(article).to.have.property('date');

            return articleData.single({
                projection : 'list',
                criteria : {
                    id : { id : -1 }
                }
            });
        }).then(function (article) {
            expect(article).to.be.undefined;
        });
    });

    it('should filter logically removed rows', () => {
        var Article = mock.models.Article,
            articleData = mock.data.article,
            article;

        return Article.create({
            title : 'this is a title example',
            content : 'this is the article content'
        }).then(function (newArticle) {
            article = newArticle;

            return articleData.list({
                projection: 'list'
            });
        }).then(function (articles) {
            expect(articles).with.length(1);
            return article.destroy();
        }).then(function () {
            return articleData.list({
                projection: 'list'
            });
        }).then(function (articles) {
            expect(articles).with.length(0);
        });
    });

    it('should throw error on unknown properties', () => {
        var articleData = mock.data.article,
            error;

        return articleData.single({
            projection : 'error'
        }).catch(function (err) {
            error = err;
        }).then(function () {
            expect(error).to.exist;
        });
    });

    it('should throw error on unregistered projection', () => {
        var articleData = mock.data.article,
            error;

        return articleData.single({
            projection : 'no-projection'
        }).catch(function (err) {
            error = err;
        }).then(function () {
            expect(error).to.exist;
        });
    });

    it('should left join associations', () => {
        var Article = mock.models.Article,
            articleData = mock.data.article;

        return Article.create({
            title : 'this is a title example',
            content : 'this is the article content'
        }).then(function () {
            return articleData.list({
                projection : 'with-info'
            });
        }).then(function (articles) {
            expect(articles).with.length(1);
        });
    });

    it('should count', () => {
        var Article = mock.models.Article,
            articleData = mock.data.article;

        return Article.bulkCreate([
            {
                title : 'this is a title example',
                content : 'this is the article content'
            },
            {
                title : 'this is another title example',
                content : 'this is the other article content'
            }
        ]).then(function () {
            return articleData.count();
        }).then(function (count) {
            expect(count).to.be.equal(2);

            return articleData.count({
                criteria : {
                    id : { id : 1 }
                }
            });
        }).then(function (count) {
            expect(count).to.be.equal(1);
        });
    });

    it('should criteria operation IS_NULL / IS_NOT_NULL', () => {
        var Article = mock.models.Article,
            articleData = mock.data.article;

        return Article.bulkCreate([
            {
                title : 'this is a title example',
                content : 'this is the article content'
            },
            {
                title : 'this is another title example',
                content : null
            }
        ]).then(function () {
            return articleData.list({
                projection: 'list',
                criteria : {
                    'with-content' : true
                }
            });
        }).then(function (list) {
            expect(list).with.length(1);
            expect(list[0]).to.have.property('title').equal('THIS IS A TITLE EXAMPLE');

            return articleData.list({
                projection: 'list',
                criteria : {
                    'without-content' : true
                }
            });
        }).then(function (list) {
            expect(list).with.length(1);
            expect(list[0]).to.have.property('title').equal('THIS IS ANOTHER TITLE EXAMPLE');
        });
    });

    it('should criteria operation IN / NOT_IN', () => {
        var Article = mock.models.Article,
            articleData = mock.data.article,
            articleId;

        return Article.bulkCreate([
            {
                title : 'this is a title example',
                content : 'this is the article content'
            },
            {
                title : 'this is another title example',
                content : null
            }
        ]).then(function () {
            return articleData.list({
                projection: 'list'
            });
        }).then(function (list) {
            expect(list).with.length(2);
            articleId = list[1].id;

            return articleData.list({
                projection: 'list',
                criteria : {
                    'ids' : { ids : [articleId] }
                }
            });
        }).then(function (list) {
            expect(list).with.length(1);
            expect(list[0]).to.have.property('title').equal('THIS IS ANOTHER TITLE EXAMPLE');

            return articleData.list({
                projection: 'list',
                criteria : {
                    'not-ids' : { 'not-ids' : [articleId] }
                }
            });
        }).then(function (list) {
            expect(list).with.length(1);
            expect(list[0]).to.have.property('title').equal('THIS IS A TITLE EXAMPLE');
        });
    });

    it('compared data should not affect cached HasMany results', () => {
        var Article = mock.models.Article,
            Author = mock.models.Author,
            Tag = mock.models.Tag,
            articleData = mock.data.article,
            author_id;

        return Tag.bulkCreate([
            { name : 'one' },
            { name : 'another' }
        ]).then(function () {
            return Author.create({
                name : 'the author'
            });
        }).then(function (author) {
            author_id = author.author_id;

            return Article.create({
                title : 'this is a title example',
                content : 'this is the article content',
                author_id : author_id
            });
        }).then(function (article) {
            return Tag.findAll().then(function (tags) {
                return article.setTags(tags);
            });
        }).then(function () {
            return Article.create({
                title : 'this is another title example',
                content : 'this is the article content',
                author_id : author_id
            });
        }).then(function (article) {
            return Tag.findAll().then(function (tags) {
                return article.setTags(tags);
            });
        }).then(function () {
            return articleData.list({
                projection : 'all',
                criteria : {
                    tag : { name : 'one' }
                },
                sort : 'by-id'
            });
        }).then(function (articles) {
            expect(articles).with.length(2);
            var article = articles[0];

            expect(article).to.have.property('id');
            expect(article).to.have.property('title').equal('this is a title example');
            expect(article).to.have.property('author').to.have.property('name').equal('the author');
            expect(article).to.have.property('tags').with.length(2);
            expect(article.tags[0]).to.have.property('name').equal('one');
            expect(article.tags[1]).to.have.property('name').equal('another');
        });
    });

    it('should handle criteria inside JOIN', () => {
        var Article = mock.models.Article,
            Author = mock.models.Author,
            articleData = mock.data.article,
            User = mock.models.User,
            ArticleViewModel = mock.models.ArticleViewModel,
            author_id,
            userId,
            anotherUserId;

        return Author.create({ name : 'the author' }).then(function (author) {
            author_id = author.author_id;

            return User.create({ name : 'a user name ' });
        }).then(function (user) {
            userId = user.user_id;

            return User.create({ name : 'another user name ' });
        }).then(function (user) {
            anotherUserId = user.user_id;

            return Article.create({
                title : 'this is a title example',
                content : 'this is the article content',
                author_id : author_id
            });
        }).then(function (article) {
            return ArticleViewModel.create({
                user_id : userId,
                article_id : article.article_id
            });
        }).then(function () {
            return Article.create({
                title : 'this is another title example',
                content : 'this is the article content',
                author_id : author_id
            });
        }).then(function (article) {
            return ArticleViewModel.create({
                user_id : anotherUserId,
                article_id : article.article_id
            });
        }).then(function () {
            return articleData.list({
                projection : 'viewed',
                criteria : {
                    user : { userId : userId }
                },
                sort : 'by-id'
            });
        }).then(function (articles) {
            expect(articles).with.length(2);
            expect(articles[0]).to.have.property('viewed').equal(true);
            expect(articles[1]).to.have.property('viewed').equal(false);

            return articleData.list({
                projection : 'viewed',
                criteria : {
                    user : { userId : anotherUserId }
                }
            });
        }).then(function (articles) {
            expect(articles).with.length(2);
            expect(articles[0]).to.have.property('viewed').equal(false);
            expect(articles[1]).to.have.property('viewed').equal(true);

            return articleData.list({
                projection : 'viewed',
                criteria : {
                    user : { userId : -1 }
                }
            });
        }).then(function (articles) {
            expect(articles).with.length(2);
            expect(articles[0]).to.have.property('viewed').equal(false);
            expect(articles[1]).to.have.property('viewed').equal(false);
        });
    });

    it('should handle criteria inside sublist', () => {
        var Article = mock.models.Article,
            Author = mock.models.Author,
            articleData = mock.data.article,
            User = mock.models.User,
            ArticleViewModel = mock.models.ArticleViewModel,
            author_id,
            userId,
            anotherUserId,
            articleId;

        return Author.create({ name : 'the author' }).then(function (author) {
            author_id = author.author_id;

            return User.create({ name : 'a user name ' });
        }).then(function (user) {
            userId = user.user_id;

            return User.create({ name : 'another user name ' });
        }).then(function (user) {
            anotherUserId = user.user_id;

            return Article.create({
                title : 'this is a title example',
                content : 'this is the article content',
                author_id : author_id
            });
        }).then(function (article) {
            articleId = article.article_id;
            return ArticleViewModel.create({
                user_id : userId,
                article_id : article.article_id
            });
        }).then(function () {
            return Article.create({
                title : 'this is another title example',
                content : 'this is the article content',
                author_id : author_id
            });
        }).then(function (article) {
            return ArticleViewModel.create({
                user_id : anotherUserId,
                article_id : article.article_id
            });
        }).then(function () {
            return articleData.single({
                projection : 'viewers',
                criteria : {
                    user : { userId : userId },
                    id : { id : articleId }
                }
            });
        }).then(function (article) {
            expect(article).to.have.property('viewers').with.length(1);

            return articleData.single({
                projection : 'viewers',
                criteria : {
                    user : { userId : anotherUserId },
                    id : { id : articleId }
                }
            });
        }).then(function (article) {
            expect(article).to.have.property('viewers').with.length(0);

            return articleData.single({
                projection : 'viewers',
                criteria : {
                    user : { userId : -1 },
                    id : { id : articleId }
                }
            });
        }).then(function (article) {
            expect(article).to.have.property('viewers').with.length(0);
        });
    });

    it('should handle number format error', function (done) {
        var Article = mock.models.Article,
            articleData = mock.data.article;

        Article.create({
            title : 'this is a title example',
            content : 'this is the article content'
        }).then(function () {
            return articleData.requestList({
                projection : 'list',
                page : 'abc',
                pageSize : 10
            });
        }).then(function (result) {
            expect(result).to.have.property('count').equal(1);

            return articleData.requestList({
                projection : 'list',
                page : 1,
                pageSize : 'abc'
            });
        }).then(function () {
            done('should fail');
        }).catch(() => done());
    });

    it('should handle criteria inside JOIN', () => {
        var Article = mock.models.Article,
            Author = mock.models.Author,
            articleData = mock.data.article,
            User = mock.models.User,
            ArticleViewModel = mock.models.ArticleViewModel,
            author_id,
            articleId,
            anotherArticleId,
            userId,
            anotherUserId;

        return Author.create({ name : 'the author' }).then(author => {
            author_id = author.author_id;
            return User.create({ name : 'a user name ' });
        }).then(user => {
            userId = user.user_id;
            return User.create({ name : 'another user name ' });
        }).then(user => {
            anotherUserId = user.user_id;
            return Article.create({
                title : 'this is a title example',
                content : 'this is the article content',
                author_id : author_id
            });
        }).then(article => {
            articleId = article.article_id;
            return ArticleViewModel.create({
                user_id : userId,
                article_id : articleId
            });
        }).then(() => {
            return Article.create({
                title : 'this is another title example',
                content : 'this is the article content',
                author_id : author_id
            });
        }).then(article => {
            anotherArticleId = article.article_id;
            return ArticleViewModel.bulkCreate([
                { user_id : anotherUserId, article_id : anotherArticleId },
                { user_id : userId, article_id : anotherArticleId }
            ]);
        }).then(() => {
            return articleData.list({
                projection : 'views-count',
                sort : 'by-id'
            });
        }).then(articles => {
            expect(articles).with.length(2);
            expect(articles[0]).to.have.property('id').equal(articleId.toString());
            expect(articles[0]).to.have.property('title').equal('this is a title example');
            expect(articles[0]).to.have.property('pageViews').equal('1');

            expect(articles[1]).to.have.property('id').equal(anotherArticleId.toString());
            expect(articles[1]).to.have.property('title').equal('this is another title example');
            expect(articles[1]).to.have.property('pageViews').equal('2');
        });
    });

});