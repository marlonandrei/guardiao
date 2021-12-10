const { WaterfallDialog, ComponentDialog } = require('botbuilder-dialogs');
const { TextPrompt } = require('botbuilder-dialogs');
const { DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');
const { CardFactory } = require('botbuilder');

const mysql2 = require('mysql2/promise');
const { Translator } = require('../translator');

const TEXT_PROMPT = 'TEXT_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_PROMPT';

var endDialog = '';

class ChecarVidaUtilDialog extends ComponentDialog {

    constructor(conservsationState, userState) {
        super('checarVidaUtilDialog');

        this.addDialog(new TextPrompt(TEXT_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.checarVidaUtil.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
        this.translator = new Translator();
    }

    async run(turnContext, accessor, entities) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id, entities);
        }

    }
 
   
    async checarVidaUtil(step) {

        const pool = mysql2.createPool({
            host: process.env.DB_host,
            user: process.env.DB_user,
            password: process.env.DB_password,
            port: process.env.DB_port,
            database: process.env.DB_database,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        var sql = "";
        sql += " select * ";
        sql += " from vw_turbina_historico ";

        const res1 = await pool.query(sql, []);
        if (res1[0].length >= 1) {

            res1[0][0].qtd;
            res1[0][0].soma;
            res1[0][0].media;
            res1[0][0].alerta;
            res1[0][0].vidautildias;
            res1[0][0].vidautildata;
        
            await step.context.sendActivity(await this.translator.t('A quantidade máxima de rotações previstas é de ' + res1[0][0].alerta) + ' rotações.');
            await step.context.sendActivity(await this.translator.t('Baseando-se num histórico de ' + res1[0][0].qtd + ' dias, onde foram rastreadas ' + res1[0][0].soma + ' rotações, tendo uma média de ' + res1[0][0].media + ' rotações por dia.'));
            await step.context.sendActivity(await this.translator.t('A quantidade de dias previstos de vida útil são ' + res1[0][0].vidautildias + ' dias e a data prevista para término da vida útil é ' + res1[0][0].vidautildata + '.'));

            const card = CardFactory.heroCard(
                '',
                CardFactory.images(['https://www.micrologi.com.br/libras/?texto=' + res1[0][0].vidautildias + '_dias'])
            );

            await step.context.sendActivity({
                attachments: [
                    card
                ]
            });

        }

        endDialog = true;
        return await step.endDialog();
    }

    async isDialogComplete() {
        return endDialog;
    }

}

module.exports.ChecarVidaUtilDialog = ChecarVidaUtilDialog;