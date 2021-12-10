const { WaterfallDialog, ComponentDialog } = require('botbuilder-dialogs');
const { DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');
const { CardFactory, MessageFactory } = require('botbuilder');

const mysql2 = require('mysql2/promise');
const storage = require('node-persist');

const { Translator } = require('../translator');

const WATERFALL_DIALOG = 'WATERFALL_PROMPT';

var endDialog = '';

class AtivarMonitoramentoDialog extends ComponentDialog {

    constructor(conservsationState, userState) {
        super('ativarMonitoramentoDialog');

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.monitorarSensores.bind(this)
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


    async monitorarSensores(step) {

        await storage.init();
        await storage.setItem(step.context._activity.from.id, '1');
        //console.log(step.context._activity.from.id);

        await step.context.sendActivity(await this.translator.t('Iniciando modo de monitoramento automático. Você será avisado(a) quando algum sensor apresentar algum valor alterado.'));

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

        while ((await storage.getItem(step.context._activity.from.id)) === '1') {

            var sql = "";
            sql += " select * ";
            sql += " from tagdados ";
            sql += " order by dathor desc ";
            sql += " limit 1 ";

            const res1 = await pool.query(sql, []);
            if (res1[0].length >= 1) {

                //Carrega lista de tags (sensores)
                sql = " ";
                sql += " select tag, descricao, minimo, maximo ";
                sql += " from tagconfig ";
                sql += " order by descricao ";

                const res2 = await pool.query(sql, []);

                //Percorre os sensores verificando
                for (var cont1 = 0; cont1 < res2[0].length; cont1++) {

                    var alerta = "";
                    if (res1[0][0][res2[0][cont1].tag] < res2[0][cont1].minimo) {
                        alerta += `Valor mínimo abaixo do limite. Mínimo permitido: ${res2[0][cont1].minimo} - Mínimo atual: ${res1[0][0][res2[0][cont1].tag]}. `;
                    }

                    if (res1[0][0][res2[0][cont1].tag] > res2[0][cont1].maximo) {
                        alerta += `Valor máximo acima do limite. Máximo permitido: ${res2[0][cont1].maximo} - Máximo atual: ${res1[0][0][res2[0][cont1].tag]}. `;
                    }

                    if (alerta != "") {

                        const textoPes = /_/gi;
                        const textoRep = '-';

                        alerta = `Atenção ao sensor: ${res2[0][cont1].descricao} (${res2[0][cont1].tag.replace(textoPes,textoRep)}). ${alerta}`;
                        await step.context.sendActivity(await this.translator.t(`${alerta}`));

                        const card = CardFactory.heroCard(
                            '',
                            CardFactory.images(['https://www.micrologi.com.br/libras/?texto=' + res2[0][cont1].tag.replace(textoPes,textoRep) + ": " + res1[0][0][res2[0][cont1].tag].toFixed(4)])
                        );
                        await step.context.sendActivity({
                            attachments: [
                                card
                            ]
                        });

                    }

                }

            }
            await new Promise(resolve => setTimeout(resolve, 60000));

        }

        endDialog = true;
        return await step.endDialog();
    }

    async isDialogComplete() {
        return endDialog;
    }

}

module.exports.AtivarMonitoramentoDialog = AtivarMonitoramentoDialog;