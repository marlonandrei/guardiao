const { WaterfallDialog, ComponentDialog } = require('botbuilder-dialogs');
const { TextPrompt } = require('botbuilder-dialogs');
const { DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');
const { TextAnalyticsClient, AzureKeyCredential } = require('@azure/ai-text-analytics');

const mysql2 = require('mysql2/promise');
const { Translator } = require('../translator');

const { ContentModeratorClient } = require("@azure/cognitiveservices-contentmoderator");
const { CognitiveServicesCredentials } = require("@azure/ms-rest-azure-js");

const TEXT_PROMPT = 'TEXT_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_PROMPT';

var endDialog = '';

class AvaliarDialog extends ComponentDialog {

    constructor(conservsationState, userState) {
        super('avaliarDialog');

        this.addDialog(new TextPrompt(TEXT_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.solicitarAvaliacao.bind(this),
            this.salvarAvaliacao.bind(this),
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

    async solicitarAvaliacao(step) {
        endDialog = false;
        return await step.prompt(TEXT_PROMPT, await this.translator.t('Conte-me o que achou do meu serviço, informe um texto de pelo menos 10 palavras, isso irá me ajudar a melhorar.'));
    }

    async salvarAvaliacao(step) {
        if (!step.values.texto) {
            step.values.texto = step.result;
        }

        const cognitiveServiceCredentials = new CognitiveServicesCredentials(process.env.ContentModeratorKey);
        const client = new ContentModeratorClient(cognitiveServiceCredentials, process.env.ContentModeratorEndPoint);

        const resMo = await client.textModeration.screenText(
            "text/plain", 
            step.values.texto
        );
        
        //Verifica se a avaliação contém comentários inapropriados
        if (resMo['terms'] !== null) {
            await step.context.sendActivity(await this.translator.t('Desculpe mas não são permitidas avaliações ofensivas e palavrões. Sua avaliação foi moderada!'));
            return await step.endDialog();
        }

        const ta = new TextAnalyticsClient(
            process.env.TEXTANALYTICS_TEXT_ENDPOINT,
            new AzureKeyCredential(process.env.TEXTANALYTICS_TEXT_SUBSCRIPTION_KEY)
        );

        const res = await ta.analyzeSentiment(
            [step.values.texto],
            'pt-PT'
        );

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

        var sentimento = '';
        switch (res[0]['sentiment']) {
            case 'positive':
                sentimento = 'positiva';
                break;
            case 'neutral':
                sentimento = 'neutra';
                break;
            case 'negative':
                sentimento = 'negativa';
                break;
            default:
                sentimento = 'positiva';
                break;
        }

        var sql = "";
        sql += " insert ";
        sql += " into avaliacoes ";
        sql += " ( ";
        sql += "    avaliacao, ";
        sql += "    sentimento, ";
        sql += "    score_positivo, ";
        sql += "    score_neutro, ";
        sql += "    score_negativo, ";
        sql += "    clientid ";
        sql += " ) ";
        sql += " values ( ";
        sql += " '" + step.values.texto + "', ";
        sql += " '" + sentimento + "', ";
        sql += res[0]['confidenceScores'].positive + ", ";
        sql += res[0]['confidenceScores'].neutral + ", ";
        sql += res[0]['confidenceScores'].negative + ", ";
        sql += " '" + step.context._activity.from.id + "' ";
        sql += " ) ";

        const res1 = await pool.query(sql, []);

        await step.context.sendActivity(await this.translator.t('Sua avaliação foi: ' + sentimento +
            '. Score da sua avaliação: (' +
            'Positiva: ' + res[0]['confidenceScores'].positive + ' / ' +
            'Neutra: ' + res[0]['confidenceScores'].neutral + ' / ' +
            'Negativa: ' + res[0]['confidenceScores'].negative + '). ' +
            'Obrigado por me avaliar. Sua avaliação foi salva e ajudará a melhorar o meu serviço.'
        ));

        endDialog = true;
        return await step.endDialog();
    }

    async isDialogComplete() {
        return endDialog;
    }

}

module.exports.AvaliarDialog = AvaliarDialog;