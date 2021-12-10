const { WaterfallDialog, ComponentDialog, TextPrompt } = require('botbuilder-dialogs');
const { DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');

const mysql2 = require('mysql2/promise');
const storage = require('node-persist');

const { Translator } = require('../translator');

const TEXT_PROMPT = 'TEXT_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_PROMPT';

var endDialog = '';

class IdiomaDialog extends ComponentDialog {

    constructor(conservsationState, userState) {
        super('idiomaDialog');

        this.addDialog(new TextPrompt(TEXT_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.solicitarIdioma.bind(this),
            this.setarIdioma.bind(this)
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

    async solicitarIdioma(step) {      
        endDialog = false;
        
        if ('idioma' in step._info.options) {
            step.values.idioma = step._info.options.idioma[0];
            return await step.continueDialog();
        } else {            
            return await step.prompt(TEXT_PROMPT, await this.translator.t('Qual idioma você deseja que eu fale (Português, Inglês, Espanhol)?'));
        }
    }

    async setarIdioma(step) { 

        if (!step.values.idioma) {
            step.values.idioma = step.result;
        }

        step.values.idioma = step.values.idioma.toLowerCase();

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
        sql += " select sigla ";
        sql += " from idiomas ";
        sql += " where linguagem like '%" + step.values.idioma + "%'; ";

        const res1 = await pool.query(sql, []);
        if (res1[0].length >= 1) {
            await storage.setItem('idioma', res1[0][0].sigla);            
            await step.context.sendActivity(await this.translator.t('A partir de agora responderei em ' + step.values.idioma));            
        } else {
            await step.context.sendActivity(await this.translator.t('Não foi possível identificar o idioma. Tente novamente!'));            
        }        

        endDialog = true;
        return await step.endDialog();
    }     

    async isDialogComplete() {
        return endDialog;
    }

}

module.exports.IdiomaDialog = IdiomaDialog;