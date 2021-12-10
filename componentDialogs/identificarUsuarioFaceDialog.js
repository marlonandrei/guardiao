const { WaterfallDialog, ComponentDialog } = require('botbuilder-dialogs');
const { DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');

const request = require('request');
const { Translator } = require('../translator');

const { PredictionAPIClient } = require("@azure/cognitiveservices-customvision-prediction");
const { ApiKeyCredentials } = require("@azure/ms-rest-js");

const WATERFALL_DIALOG = 'WATERFALL_PROMPT';

const mysql2 = require('mysql2/promise');

var endDialog = '';
var identificacao = '';

class IdentificarUsuarioFaceDialog extends ComponentDialog {

    constructor(conservsationState, userState) {
        super('identificarUsuarioDialog');

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.identificarUsuario.bind(this),
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

    async getFaceVerify(faceId1, faceId2) {

        const options = {
            uri: 'https://guardiao-face.cognitiveservices.azure.com/face/v1.0/verify',
            body: '{"faceId1": ' + '"' + faceId1 + '", "faceId2": ' + '"' + faceId2 + '"}',
            headers: {
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': process.env.FaceApiKey
            }
        };

        return new Promise(function (resolve, reject) {
            request.post(options, function (err, resp, body) {
                if (err) {
                    reject(err);
                } else {
                    resolve(JSON.parse(body));
                }
            })
        });
    }

    async getFaceId(imageUrl) {
        const params = {
            'returnFaceId': 'true'
        };

        const options = {
            uri: 'https://guardiao-face.cognitiveservices.azure.com/face/v1.0/detect',
            qs: params,
            body: '{"url": ' + '"' + imageUrl + '"}',
            headers: {
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': process.env.FaceApiKey
            }
        };

        return new Promise(function (resolve, reject) {
            request.post(options, function (err, resp, body) {
                if (err) {
                    reject(err);
                } else {
                    resolve(JSON.parse(body));
                }
            })
        });
    }

    async identificarUsuario(step) {
        endDialog = false;

        identificacao = '';

        //Identifica foto enviada
        const faceUrl1 = step.context.activity['attachments'][0].contentUrl;
        const resp1 = await this.getFaceId(faceUrl1);
        var faceId1 = '';

        //Verifica se é uma face
        if (resp1[0] === undefined) {
            await step.context.sendActivity(await this.translator.t('A foto enviada não é uma face. Procedendo com reconhecimento de imagens.'));

            const credentials = new ApiKeyCredentials({ inHeader: { "Prediction-key": process.env.CustonVisionKey } });
            const client = new PredictionAPIClient(credentials, process.env.CustonVisionEndpoint);

            var ret = await client.classifyImageUrl(
                process.env.CustonVisionProjectId,
                process.env.CustonVisionIteration,
                { url: step.context.activity['attachments'][0].contentUrl });

            identificacao = '';

            if (ret.predictions[0].tagName) {

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
                sql += " select nome, id, tipo ";
                sql += " from usuarios ";
                sql += " where tag = '" + ret.predictions[0].tagName + "'; ";

                const res1 = await pool.query(sql, []);
                if (res1[0].length >= 1) {
                    identificacao = res1[0][0].nome;
                }

            }

        //Se não for uma face, então checa pelo reconhecimento de imagens.
        } else {
            await step.context.sendActivity(await this.translator.t('A foto enviada é uma face. Procedendo com reconhecimento facial.'));

            faceId1 = resp1[0]['faceId'];

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
            sql += " select nome, tag ";
            sql += " from usuarios ";

            const regs = await pool.query(sql, []);
            var tag = '';
            var nome = '';

            for (var cont = 0; cont < regs[0].length; cont++) {
                nome = regs[0][cont].nome;
                tag = regs[0][cont].tag;

                //Identifica foto do banco de dados
                const faceUrl2 = 'http://guardiaobot.com.br/fotos/' + tag + '.jpg';
                const resp2 = await this.getFaceId(faceUrl2);
                var faceId2 = '';
                if (resp2[0] !== undefined) {
                    faceId2 = resp2[0]['faceId'];
                }

                //Checa similaridade
                if ((faceId1 !== '') && (faceId2 !== '')) {
                    var verify = await this.getFaceVerify(faceId1, faceId2);

                    //await step.context.sendActivity(await this.translator.t(faceId1));        
                    //await step.context.sendActivity(await this.translator.t(faceId2));        
                    if (verify['isIdentical']) {
                        const perc = Math.round(100 * verify['confidence']);
                        await step.context.sendActivity(await this.translator.t('Com ' + perc + '% de chance de reconhecimento facial, comprovamos que você é um usuário(a) cadastrado(a).'));
                        identificacao = nome;
                    }
                }

            }
        }

        endDialog = true;
        return await step.endDialog();
    }

    async getIdentificacao() {
        return identificacao;
    }

    async isDialogComplete() {
        return endDialog;
    }

}

module.exports.IdentificarUsuarioFaceDialog = IdentificarUsuarioFaceDialog;