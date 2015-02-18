/*
 * TODO
 * As funções abaixo só funcionam no MySQL, deve ser feito um tratamento para
 * identificar o dialeto utilizado no Sequelize e utilizar a função de acordo com o SGBD.
 */
module.exports = {

    convert : function (path, model, options) {
        var charset = options && options.charset ? options.charset : 'utf8';
        return 'CONVERT(' + path + ' USING ' + charset + ')';
    },

    group_concat : function (path) {
        return 'GROUP_CONCAT(' + path + ')';
    }

};

