const { WaterfallDialog, ComponentDialog } = require('botbuilder-dialogs');
const { TextPrompt } = require('botbuilder-dialogs');
const { DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');
const { CardFactory, MessageFactory } = require('botbuilder');
const { TextAnalyticsClient, AzureKeyCredential } = require('@azure/ai-text-analytics');

const mysql2 = require('mysql2/promise');
const { Translator } = require('../translator');

const TagConfig = require('../class/tagConfig');
const tagConfig = new TagConfig();

const TEXT_PROMPT = 'TEXT_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_PROMPT';

var endDialog = '';

class ObterValorDialog extends ComponentDialog {

    constructor(conservsationState, userState) {
        super('obterValorDialog');

        this.addDialog(new TextPrompt(TEXT_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.obterSensor.bind(this),
            this.exibirValor.bind(this)
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

    async obterSensor(step) {
        endDialog = false;

        if ('sensor' in step._info.options) {
            step.values.sensor = step._info.options.sensor[0];
            return await step.continueDialog();
        } else {
            return await step.prompt(TEXT_PROMPT, await this.translator.t('Qual sensor deseja verificar?'));
        }

    }

    async exibirValor(step) {
        var map = { "â": "a", "Â": "A", "à": "a", "À": "A", "á": "a", "Á": "A", "ã": "a", "Ã": "A", "ê": "e", "Ê": "E", "è": "e", "È": "E", "é": "e", "É": "E", "î": "i", "Î": "I", "ì": "i", "Ì": "I", "í": "i", "Í": "I", "õ": "o", "Õ": "O", "ô": "o", "Ô": "O", "ò": "o", "Ò": "O", "ó": "o", "Ó": "O", "ü": "u", "Ü": "U", "û": "u", "Û": "U", "ú": "u", "Ú": "U", "ù": "u", "Ù": "U", "ç": "c", "Ç": "C" };

        //Pega valor
        if (!step.values.sensor) {
            step.values.sensor = step.result;
        }

        //Formata string para busca
        step.values.sensor = step.values.sensor.toUpperCase();
        step.values.sensor = step.values.sensor.replace(/[\W\[\] ]/g, function (a) { return map[a] || a });

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
        sql += " select tag ";
        sql += " from tagconfig ";
        sql += " where descricao like '%" + step.values.sensor + "%'; ";

        const res1 = await pool.query(sql, []);
        if (res1[0].length >= 1) {

            var minimo = tagConfig.getMinimo(res1[0][0].tag);

            sql = " ";
            sql += " select `" + res1[0][0].tag + "` as valor, dathor ";
            sql += " from tagdados ";
            sql += " order by dathor desc ";
            sql += " limit 1 ";

            const res2 = await pool.query(sql, []);
            if (res2[0].length >= 1) {

                var txtret = step.values.sensor + " está em: " + res2[0][0].valor.toFixed(0);

                await step.context.sendActivity(await this.translator.t(`${txtret}`));

                const card = CardFactory.heroCard(
                    '',
                    CardFactory.images(['https://www.micrologi.com.br/libras/?texto=' + res2[0][0].valor.toFixed(0)])
                );

                await step.context.sendActivity({
                    attachments: [
                        card
                    ]
                });


            }

        } else {

            var txtret = await this.translator.t('Sensor não encontrado.');

            const card = CardFactory.heroCard(
                txtret,
                CardFactory.images(['https://www.micrologi.com.br/libras/?texto=sensor-nao-encontrado'])
            );

            await step.context.sendActivity({            
                attachments: [
                    card
                ]
            });

            var resp = MessageFactory.suggestedActions(['Informe a lista de sensores disponíveis'],'');
            await step.context.sendActivity(resp);

        }

        endDialog = true;
        return await step.endDialog();
    }

    async isDialogComplete() {
        return endDialog;
    }

}

module.exports.ObterValorDialog = ObterValorDialog;