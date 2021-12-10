const { WaterfallDialog, ComponentDialog } = require('botbuilder-dialogs');
const { DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');

const mysql2 = require('mysql2/promise');
const { Translator } = require('../translator');

const WATERFALL_DIALOG = 'WATERFALL_PROMPT';

var endDialog = '';

class InformarSensoresDialog extends ComponentDialog {

    constructor(conservsationState, userState) {
        super('informarSensoresDialog');

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.listarSensores.bind(this)
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

    async listarSensores(step) {

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
        sql += " select *  ";
        sql += " from tagconfig ";

        const res1 = await pool.query(sql, []);
        
        for (var cont=0; cont<res1[0].length; cont++) {

            var sensor = res1[0][cont].descricao + ' (Sensor: ' + res1[0][cont].tag + ') - Mínimo: ' + res1[0][cont].minimo + '  Máximo: ' + res1[0][cont].maximo;
            await step.context.sendActivity(await this.translator.t(sensor));

        }

        endDialog = true;
        return await step.endDialog();
    }

    async isDialogComplete() {
        return endDialog;
    }

}

module.exports.InformarSensoresDialog = InformarSensoresDialog;