// File reading
const fs = require("fs")

// Util
const dataUtil = require("../util/dataUtil");
const sqlite3 = require('sqlite3').verbose();
const handshake = require("../util/handshake");
const c = require("../util/colog");

// Networking
const dgram = require("dgram");
const kcp = require("node-kcp");

var clients = {};

var initialKey = function () {
    let db = new sqlite3.Database('./keys.db', (error) => {
        if (error) {
            throw error; // handling is amazing
        }

        // this is hardcoded too
        db.get('SELECT * FROM keys WHERE first_bytes=51544', async (err, row) => { // SQLite Database
            initialKey = Buffer.from(row.key_buffer)
        });
    });
}();

// i hardcoded this so bad lmao
var seedKey = undefined; // Hardcoding is no more :crab:
var token = 0x00000000;

var server = dgram.createSocket("udp4");

var CharacterID = 10000050
var TalentID = 50


function handleHandshake(data, type) {
    console.log(data);
    switch (type) {
        case 255: // 0xFF -- NEW CONNECTION
            var buffer = Buffer.from(data)
            var Handshake = new handshake();
            Handshake.decode(buffer);

            var _Conv = (Date.now());
            var _Token = 0xFFCCEEBB ^ ((Date.now() >> 32) & 0xFFFFFFFF);

            var newBuffer = new handshake([0x145, 0x14514545], _Conv, _Token);
            return newBuffer;
        case 404: // 0X194 -- DISCONNECTION
            var buffer = Buffer.from(data)
            var Handshake = new handshake(handshake.MAGIC_DISCONNECT);

            seedKey = undefined

            return Handshake
        default:
            console.log("[UNHANDLED HANDSHAKE] %x" + type)
            return;
    }


}

var sentTimes = {}
async function sendPacketAsyncByName(kcpobj, name, keyBuffer, Packet = undefined) {

    // Reads the bin file from the packet
    if (Packet == undefined) {
        //console.log("[FS] READING %s", name)
        Packet = fs.readFileSync("bin/" + name + ".bin")
    }

    if (parseInt(name.charAt(name.length - 1))) {
        name = name.slice(0, name.length - 1)
    }
    // Determines packetID by name
    const packetID = dataUtil.getPacketIDByProtoName(name)

    // logs the packet [DEBUG]
    //console.log(Packet)
    // Sends the packet
    kcpobj.send(await dataUtil.dataToPacket(Packet, packetID, keyBuffer));
    console.log("[SENT] %i (%s) was sent back", packetID, name)
}
posScene = {
    "X": -6200.6272,
    "Y": 300.67052,
    "Z": -3000.0728
}
var AreaRspCount, PointRspCount, WorldAreaCount, GachaRspValue = 0
async function handleSendPacket(protobuff, packetID, kcpobj, keyBuffer) {

    // Packed ID By Name so no more HARDCODING
    const packetIdName = dataUtil.getProtoNameByPacketID(packetID);

    // Data is declared here because node-js would say data is already defined
    var data;
    switch (packetIdName) {
        case "PingReq": // PingReq

            const PingRsp = {
                clientTime: protobuff["clientTime"],
                ueTime: protobuff["ueTime"]
            }

            // To protobuffer
            data = await dataUtil.objToProtobuffer(PingRsp, dataUtil.getPacketIDByProtoName("PingRsp"));
            sendPacketAsyncByName(kcpobj, "PingRsp", keyBuffer, data)


            break;

        case "MarkMapReq":
            if (!protobuff.op) {
                posScene = {
                    "X": protobuff.mark.pos.X,
                    "Y": 500.67052,
                    "Z": protobuff.mark.pos.Z
                }
                console.log(posScene)

                const SceneEntityAppearNotifyw = await dataUtil.dataToProtobuffer(fs.readFileSync("./bin/SceneEntityAppearNotify.bin"), dataUtil.getPacketIDByProtoName("SceneEntityAppearNotify"))
                SceneEntityAppearNotifyw.entityList[0].AvatarId = CharacterID
                SceneEntityAppearNotifyw.entityList[0].motionInfo.pos = posScene
    
                // To protobuffer;
                sendPacketAsyncByName(kcpobj, "SceneEntityAppearNotify", keyBuffer, await dataUtil.objToProtobuffer(SceneEntityAppearNotifyw, dataUtil.getPacketIDByProtoName("SceneEntityAppearNotify")));
            }

            break;

        case "GetPlayerTokenReq": // GetPlayerTokenReq

            // Needs to be readed and passed to protobuffer to change the secretKeySeed
            const GetPlayerTokenRsp = await dataUtil.dataToProtobuffer(fs.readFileSync("bin/GetPlayerTokenRsp.bin"), dataUtil.getPacketIDByProtoName("GetPlayerTokenRsp"))

            // Secret Key is now 2 to make it easier
            GetPlayerTokenRsp.secretKeySeed = 2
            GetPlayerTokenRsp.uid = 1
            //GetPlayerTokenRsp.accountUid = "1"
            //GetPlayerTokenRsp.gmUid = "1"

            // Executes C# compiled EXE that returns the XOR Blob determined by secretKeySeed
            require('child_process').execFile('./yuanshenKey/ConsoleApp2.exe', [2], function (err, data) {
                if (err) {
                    console.log(err)
                }
                seedKey = Buffer.from(data.toString(), 'hex'); // Key
            });


            data = await dataUtil.objToProtobuffer(GetPlayerTokenRsp, dataUtil.getPacketIDByProtoName("GetPlayerTokenRsp"));
            sendPacketAsyncByName(kcpobj, "GetPlayerTokenRsp", keyBuffer, data)

            break;

        case "TowerAllDataReq": // TowerAllDataReq

            const TowerAllDataRsp = await dataUtil.dataToProtobuffer(fs.readFileSync("bin/TowerAllDataRsp.bin"), dataUtil.getPacketIDByProtoName("TowerAllDataRsp"))
			
			TowerAllDataRsp.isFinishedEntranceFloor = true
			TowerAllDataRsp.isFirstInteract = true
			
			sendPacketAsyncByName(kcpobj, "TowerAllDataRsp", keyBuffer, await dataUtil.objToProtobuffer(TowerAllDataRsp, dataUtil.getPacketIDByProtoName("TowerAllDataRsp")))
			
			break;

        case "AvatarWearFlycloakReq":
            var flyCloak = protobuff.flycloakId
            var AvatarGUID = protobuff.avatarGuid
            console.log(flyCloak)
            console.log(parseInt(AvatarGUID))
            
            const AvatarWearFlycloakRsp = {
                "flycloakId": parseInt(flyCloak),
                "avatarGuid": parseInt(AvatarGUID)
            }

            sendPacketAsyncByName(kcpobj, "AvatarWearFlycloakRsp", keyBuffer, await dataUtil.objToProtobuffer(AvatarWearFlycloakRsp, dataUtil.getPacketIDByProtoName("AvatarWearFlycloakRsp")))

            const AvatarDataNotify1 = await dataUtil.dataToProtobuffer(fs.readFileSync("./bin/AvatarDataNotify.bin"), dataUtil.getPacketIDByProtoName("AvatarDataNotify"))
			
			//Thoma
            AvatarDataNotify1.avatarList[4].avatarId = CharacterID
            AvatarDataNotify1.avatarList[4].guid = AvatarGUID
            AvatarDataNotify1.avatarList[4].wearingFlycloakId = flyCloak
			AvatarDataNotify1.avatarList[4].equipGuidList = protobuff.equipGuid
			AvatarDataNotify1.avatarList[4].propMap = {
				"1001": {
					"type": 1001,
					"ival": "0"
				},
				"4001": {
					"type": 4001,
					"ival": "90",
					"val": "90"
				},
				"1002": {
					"type": 1002,
					"ival": "6"
				},
				"1003": {
					"type": 1003,
					"ival": "0"
				},
				"1004": {
					"type": 1004,
					"ival": "0"
				}
			}
			AvatarDataNotify1.avatarList[4].fightPropMap = {
				"46": 0,
        		"1010": 30000,
        		"50": 0,
        		"51": 0,
        		"52": 0,
        		"53": 0,
        		"54": 0,
        		"55": 0,
        		"56": 0,
        		"1": 0,
        		"2": 430,
        		"3": 0.0835,
        		"4": 0,
        		"5": 17,
        		"6": 0.1973522,
        		"71": 50,
        		"7": 0,
        		"2000": 30000,
        		"2001": 30000,
        		"2002": 30000,
        		"2003": 30000,
        		"20": 300.00,
        		"21": 0,
        		"22": 300.00,
        		"23": 1,
        		"26": 0,
        		"27": 0.2,
        		"28": 0,
        		"29": 0,
        		"30": 0,
        		"40": 0,
        		"1001": 79,
        		"41": 0,
        		"42": 0,
        		"43": 0,
        		"44": 0,
        		"45": 0
			}
            AvatarDataNotify1.avatarList[4].skillDepotId = 5001
			AvatarDataNotify1.avatarList[4].fetterInfo.expLevel = 10
			AvatarDataNotify1.avatarList[4].inherentProudSkillList = [502101, 502201, 502301, 502401, 502501]
			AvatarDataNotify1.avatarList[4].talentIdList = [501, 502, 503, 504, 505, 506]
			AvatarDataNotify1.avatarList[4].proudSkillExtraLevelMap = {
				"5032": 3,
				"5039": 3
			}
            AvatarDataNotify1.avatarList[4].skillLevelMap = {
                "10501": 10,
                "10502": 10,
                "10505": 10
            }
			
            AvatarDataNotify1.ownedFlycloakList = [140001, 140002, 140003, 140004, 140005, 140006, 140007, 140008, 140009, 140010, 140011]	// Flycloaks' id.
            // To protobuffer
            sendPacketAsyncByName(kcpobj, "AvatarDataNotify", keyBuffer, await dataUtil.objToProtobuffer(AvatarDataNotify1, dataUtil.getPacketIDByProtoName("AvatarDataNotify")));

            break;

        case "WearEquipReq":
            const WearEquipRsp = {
                "avatarGuid": parseInt(protobuff.avatarGuid),
                "equipGuid": parseInt(protobuff.equipGuid),
            }

            // To protobuffer

            const AvatarEquipChangeNotify = await dataUtil.dataToProtobuffer(fs.readFileSync("./bin/AvatarEquipChangeNotify.bin"), dataUtil.getPacketIDByProtoName("AvatarEquipChangeNotify"))
			
            AvatarEquipChangeNotify.avatarGuid = protobuff.avatarGuid
            AvatarEquipChangeNotify.equipGuid = protobuff.equipGuid
            AvatarEquipChangeNotify.weapon.guid = protobuff.equipGuid
			AvatarEquipChangeNotify.weapon.itemId = 13416
            
            sendPacketAsyncByName(kcpobj, "AvatarEquipChangeNotify", keyBuffer, await dataUtil.objToProtobuffer(AvatarEquipChangeNotify, dataUtil.getPacketIDByProtoName("AvatarEquipChangeNotify")));

            console.log(WearEquipRsp)
            sendPacketAsyncByName(kcpobj, "WearEquipRsp", keyBuffer, await dataUtil.objToProtobuffer(WearEquipRsp, dataUtil.getPacketIDByProtoName("WearEquipRsp")))

            break;

        case "EnterSceneDoneReq":

            //sendPacketAsyncByName(kcpobj, "SceneEntityAppearNotify", keyBuffer)
            const SceneEntityAppearNotify = await dataUtil.dataToProtobuffer(fs.readFileSync("./bin/SceneEntityAppearNotify.bin"), dataUtil.getPacketIDByProtoName("SceneEntityAppearNotify"))
            SceneEntityAppearNotify.entityList[0].AvatarId = CharacterID
			SceneEntityAppearNotify.entityList[0].equipGuidList = "2600256355860217858"
			SceneEntityAppearNotify.entityList[0].motionInfo.pos = posScene
			SceneEntityAppearNotify.entityList[0].avatar.uid = 1
            // To protobuffer;
            sendPacketAsyncByName(kcpobj, "SceneEntityAppearNotify", keyBuffer, await dataUtil.objToProtobuffer(SceneEntityAppearNotify, dataUtil.getPacketIDByProtoName("SceneEntityAppearNotify")));
            sendPacketAsyncByName(kcpobj, "EnterSceneDoneRsp", keyBuffer)

            break;

        case "UnlockTransPointReq":
            var pointId = protobuff.pointId
			console.log(pointId)
            const UnlockTransPointRsp = {
                "sceneId": 3,
                "pointId": parseInt(protobuff.pointId),
            }
			
			const ScenePointUnlockNotify = await dataUtil.dataToProtobuffer(fs.readFileSync("./bin/ScenePointUnlockNotify.bin"), dataUtil.getPacketIDByProtoName("ScenePointUnlockNotify"))
			
			ScenePointUnlockNotify.sceneId = 3
			ScenePointUnlockNotify.pointList = protobuff.pointId
			
            sendPacketAsyncByName(kcpobj, "ScenePointUnlockNotify", keyBuffer, await dataUtil.objToProtobuffer(ScenePointUnlockNotify, dataUtil.getPacketIDByProtoName("ScenePointUnlockNotify")));

            console.log(UnlockTransPointRsp)
            sendPacketAsyncByName(kcpobj, "UnlockTransPointRsp", keyBuffer, await dataUtil.objToProtobuffer(UnlockTransPointRsp, dataUtil.getPacketIDByProtoName("UnlockTransPointRsp")))
			
		break;

        case "PlayerLoginReq": // PlayerLoginReq

            //AvatarDataNotify
            const AvatarDataNotify = await dataUtil.dataToProtobuffer(fs.readFileSync("./bin/AvatarDataNotify.bin"), dataUtil.getPacketIDByProtoName("AvatarDataNotify"))
			AvatarDataNotify.avatarList[4].avatarId = CharacterID
            // To protobuffer
            var AvatarDataNotifyData = await dataUtil.objToProtobuffer(AvatarDataNotify, dataUtil.getPacketIDByProtoName("AvatarDataNotify"));
            sendPacketAsyncByName(kcpobj, "AvatarDataNotify", keyBuffer, AvatarDataNotifyData);

            // ActivityScheduleInfoNotify
			sendPacketAsyncByName(kcpobj, "ActivityScheduleInfoNotify", keyBuffer);

            // PlayerPropNotify
			sendPacketAsyncByName(kcpobj, "PlayerPropNotify", keyBuffer);

            // PlayerDataNotify
            const PlayerDataNotify = await dataUtil.dataToProtobuffer(fs.readFileSync("./bin/PlayerDataNotify.bin"), dataUtil.getPacketIDByProtoName("PlayerDataNotify"))
            PlayerDataNotify.nickName = "Waffel | PANCAKE (PS)"
			PlayerDataNotify.propMap["10015"].ival = 99999999
			PlayerDataNotify.propMap["10015"].val = 99999999
			
			PlayerDataNotify.propMap["10013"].ival = 60
			PlayerDataNotify.propMap["10013"].val = 60

			PlayerDataNotify.propMap["10016"].ival = 99999999
			PlayerDataNotify.propMap["10016"].val = 99999999

			PlayerDataNotify.propMap["10019"].ival = 8
			PlayerDataNotify.propMap["10019"].val = 8
            // To protobuffer
            var PlayerDataNotifyData = await dataUtil.objToProtobuffer(PlayerDataNotify, dataUtil.getPacketIDByProtoName("PlayerDataNotify"));
            sendPacketAsyncByName(kcpobj, "PlayerDataNotify", keyBuffer, PlayerDataNotifyData);

            // AchievementUpdateNotify
            sendPacketAsyncByName(kcpobj, "AchievementUpdateNotify", keyBuffer);

            // OpenStateUpdateNotify
			sendPacketAsyncByName(kcpobj, "OpenStateUpdateNotify", keyBuffer);

            // StoreWeightLimitNotify
            const StoreWeightLimitNotify =  { "storeType": "STORE_PACK", "weightLimit": 90000, "materialCountLimit": 2000, "weaponCountLimit": 2000, "reliquaryCountLimit": 1000, "furnitureCountLimit": 2000 }

            await sendPacketAsyncByName(kcpobj, "StoreWeightLimitNotify", keyBuffer, await dataUtil.objToProtobuffer(StoreWeightLimitNotify,   
            await dataUtil.getPacketIDByProtoName("StoreWeightLimitNotify")))

            // PlayerStoreNotify

            const PlayerStoreNotify = {
    "storeType": "STORE_PACK",
    "itemList": [{
        "itemId": 13416,
        "guid": "1",
        "equip": {
            "weapon": {
                "level": 90,
				"promoteLevel": 6,
                "affixMap": {
                    "113416": 0
				}
            }
        }
    }],
    "weightLimit": 2000,
}
            await sendPacketAsyncByName(kcpobj, "PlayerStoreNotify", keyBuffer, await dataUtil.objToProtobuffer(PlayerStoreNotify, dataUtil.getPacketIDByProtoName("PlayerStoreNotify")))

            //AvatarSatiationDataNotify
            sendPacketAsyncByName(kcpobj, "AvatarSatiationDataNotify", keyBuffer);

            //RegionSearchNotify
			sendPacketAsyncByName(kcpobj, "RegionSearchNotify", keyBuffer);

            //PlayerEnterSceneNotify
            const PlayerEnterSceneNotify1 = await dataUtil.dataToProtobuffer(fs.readFileSync("./bin/PlayerEnterSceneNotify.bin"), dataUtil.getPacketIDByProtoName("PlayerEnterSceneNotify"))
            PlayerEnterSceneNotify1.pos = posScene
            sendPacketAsyncByName(kcpobj, "PlayerEnterSceneNotify", keyBuffer, await dataUtil.objToProtobuffer(PlayerEnterSceneNotify1, dataUtil.getPacketIDByProtoName("PlayerEnterSceneNotify")));

            // Response
            const PlayerLoginRsp = await dataUtil.dataToProtobuffer(fs.readFileSync("./bin/PlayerLoginRsp.bin"), dataUtil.getPacketIDByProtoName("PlayerLoginRsp"))
            PlayerLoginRsp.targetUid = 1
            PlayerLoginRsp.targetHomeOwnerUid = 1
            //PlayerLoginRsp.isDataNeedRelogin = false
            //PlayerLoginRsp.isScOpen = false
            //PlayerLoginRsp.isUseAbilityHash = false
            // To protobuffer
            sendPacketAsyncByName(kcpobj, "PlayerLoginRsp", keyBuffer, await dataUtil.objToProtobuffer(PlayerLoginRsp, dataUtil.getPacketIDByProtoName("PlayerLoginRsp")));

            break;
			
        case "SetPlayerHeadImageReq":
          
            sendPacketAsyncByName(kcpobj, "SetPlayerHeadImageRsp", keyBuffer, await dataUtil.objToProtobuffer({"avatarId": protobuff.avatarId,"profilePicture":{"avatarId": protobuff.avatarId}}, dataUtil.getPacketIDByProtoName("SetPlayerHeadImageRsp")))
            break;
			
        case "SetNameCardReq":
            var CardID = protobuff.nameCardId
            console.log(CardID)

            const SetNameCardRsp = { "nameCardId": parseInt(CardID) || 210001 }

            sendPacketAsyncByName(kcpobj, "SetNameCardRsp", keyBuffer, await dataUtil.objToProtobuffer(SetNameCardRsp, dataUtil.getPacketIDByProtoName("SetNameCardRsp")))
            break;
			
        case "UpdatePlayerShowAvatarListReq":

            // Response
			
			const UpdatePlayerShowAvatarListRsp = { "showAvatarIdList": [10000052, 10000054, 10000056] }
			
            sendPacketAsyncByName(kcpobj, "UpdatePlayerShowAvatarListRsp", keyBuffer, await dataUtil.objToProtobuffer(UpdatePlayerShowAvatarListRsp, dataUtil.getPacketIDByProtoName("UpdatePlayerShowAvatarListRsp")))
            break;
			
        case "GetAllUnlockNameCardReq":
            CardList = []
            for (Possible = 0; Possible < 105; Possible++) {
                CardList[Possible] = 210001 + Possible
            }
            const GetAllUnlockNameCardRsp = { "nameCardList": CardList }

            sendPacketAsyncByName(kcpobj, "GetAllUnlockNameCardRsp", keyBuffer, await dataUtil.objToProtobuffer(GetAllUnlockNameCardRsp, dataUtil.getPacketIDByProtoName("GetAllUnlockNameCardRsp")))
            break;
			
        case "SetNameCardReq":

            // Response
            sendPacketAsyncByName(kcpobj, "SetNameCardRsp", keyBuffer)

            break;
			
        case "UnlockTransPointReq":

            // Response
            sendPacketAsyncByName(kcpobj, "UnlockTransPointRsp", keyBuffer)

            break;

        case "AvatarWearFlycloakReq":

            // Response
            sendPacketAsyncByName(kcpobj, "AvatarWearFlycloakRsp", keyBuffer)

            break;

        case "GetPlayerSocialDetailReq":

            // Response
            sendPacketAsyncByName(kcpobj, "GetPlayerSocialDetailRsp", keyBuffer)

            break;

        case "ChangeAvatarReq":

            // SceneEntityDisappearNotify
            sendPacketAsyncByName(kcpobj, "SceneEntityDisappearNotify", keyBuffer)

            // SceneEntityAppearNotify
            const SceneEntityAppearNotify3 = await dataUtil.dataToProtobuffer(fs.readFileSync("./bin/SceneEntityAppearNotify.bin"), dataUtil.getPacketIDByProtoName("SceneEntityAppearNotify"))
            SceneEntityAppearNotify3.entityList[0].motionInfo.pos = {
                "X": -6200.6272,
                "Y": 300.67052,
                "Z": -3000.0728
            }
            // To protobuffer;
            sendPacketAsyncByName(kcpobj, "SceneEntityAppearNotify", keyBuffer, await dataUtil.objToProtobuffer(SceneEntityAppearNotify3, dataUtil.getPacketIDByProtoName("SceneEntityAppearNotify")));

            // PlayerEnterSceneInfoNotify
            sendPacketAsyncByName(kcpobj, "PlayerEnterSceneInfoNotify", keyBuffer)

            // Response
            sendPacketAsyncByName(kcpobj, "ChangeAvatarRsp", keyBuffer)

            break;

        case "GetPlayerBlacklistReq":

            // Response
            //sendPacketAsyncByName(kcpobj, "GetPlayerBlacklistRsp", keyBuffer)

            break;

        case "GetShopReq":

            // Response
            //sendPacketAsyncByName(kcpobj, "GetShopRsp", keyBuffer)

            break;

        case "EnterSceneReadyReq":

            // EnterScenePeerNotify
            sendPacketAsyncByName(kcpobj, "EnterScenePeerNotify", keyBuffer);

            // Response
            sendPacketAsyncByName(kcpobj, "EnterSceneReadyRsp", keyBuffer)

            break;

        case "GetActivityInfoReq":
            const GetActivityInfoRsp = await dataUtil.dataToProtobuffer(fs.readFileSync("./bin/GetActivityInfoRsp.bin"), dataUtil.getPacketIDByProtoName("GetActivityInfoRsp"))
            GetActivityInfoRsp.activityInfoList[2].activityId= 2002
            // To protobuffer
            var GetActivityInfoRspData = await dataUtil.objToProtobuffer(GetActivityInfoRsp, dataUtil.getPacketIDByProtoName("GetActivityInfoRsp"));
            sendPacketAsyncByName(kcpobj, "GetActivityInfoRsp", keyBuffer, GetActivityInfoRspData);

        case "SceneInitFinishReq":

            // WorldOwnerDailyTaskNotify
            sendPacketAsyncByName(kcpobj, "WorldOwnerDailyTaskNotify", keyBuffer);

            //WorldPlayerInfoNotify
            const WorldPlayerInfoNotify = await dataUtil.dataToProtobuffer(fs.readFileSync("./bin/WorldPlayerInfoNotify.bin"), dataUtil.getPacketIDByProtoName("WorldPlayerInfoNotify"))
            WorldPlayerInfoNotify.playerInfoList[0].name = "Waffel | PANCAKE (PS)"
	    WorldPlayerInfoNotify.playerUidList[0] = 1
            WorldPlayerInfoNotify.playerInfoList[0].uid = 1
            // To protobuffer
            data = await dataUtil.objToProtobuffer(WorldPlayerInfoNotify, dataUtil.getPacketIDByProtoName("WorldPlayerInfoNotify"));
            sendPacketAsyncByName(kcpobj, "WorldPlayerInfoNotify", keyBuffer, data);

            //WorldDataNotify
            sendPacketAsyncByName(kcpobj, "WorldDataNotify", keyBuffer);

            //WorldOwnerBlossomBriefInfoNotify
            sendPacketAsyncByName(kcpobj, "WorldOwnerBlossomBriefInfoNotify", keyBuffer);

            //TeamResonanceChangeNotify
            sendPacketAsyncByName(kcpobj, "TeamResonanceChangeNotify", keyBuffer);

            //WorldAllRoutineTypeNotify
            sendPacketAsyncByName(kcpobj, "WorldAllRoutineTypeNotify", keyBuffer);

            // SceneForceUnlockNotify
            sendPacketAsyncByName(kcpobj, "SceneForceUnlockNotify", keyBuffer);

            //PlayerGameTimeNotify
            sendPacketAsyncByName(kcpobj, "PlayerGameTimeNotify", keyBuffer);

            //SceneTimeNotify
            sendPacketAsyncByName(kcpobj, "SceneTimeNotify", keyBuffer);

            //SceneDataNotify
            sendPacketAsyncByName(kcpobj, "SceneDataNotify", keyBuffer);

			//SceneAreaWeatherNotify
            const SceneAreaWeatherNotify = { "weatherAreaId": 3100, "climateType": 3 }

            sendPacketAsyncByName(kcpobj, "SceneAreaWeatherNotify", keyBuffer, await dataUtil.objToProtobuffer(SceneAreaWeatherNotify, dataUtil.getPacketIDByProtoName("SceneAreaWeatherNotify")))

            //AvatarEquipChangeNotify
            sendPacketAsyncByName(kcpobj, "AvatarEquipChangeNotify2", keyBuffer);

            //AvatarEquipChangeNotify1
            sendPacketAsyncByName(kcpobj, "AvatarEquipChangeNotify1", keyBuffer);

            //AvatarEquipChangeNotify2
            sendPacketAsyncByName(kcpobj, "AvatarEquipChangeNotify1", keyBuffer);

            //AvatarEquipChangeNotify3
            sendPacketAsyncByName(kcpobj, "AvatarEquipChangeNotify2", keyBuffer);

            //HostPlayerNotify
            sendPacketAsyncByName(kcpobj, "HostPlayerNotify", keyBuffer);

            //ScenePlayerInfoNotify
            const ScenePlayerInfoNotify = await dataUtil.dataToProtobuffer(fs.readFileSync("./bin/ScenePlayerInfoNotify.bin"), dataUtil.getPacketIDByProtoName("ScenePlayerInfoNotify"))
            ScenePlayerInfoNotify.playerInfoList[0].name = "PANCAKE (PS)"
            ScenePlayerInfoNotify.playerInfoList[0].onlinePlayerInfo.nickname = "PANCAKE (PS)"
	    ScenePlayerInfoNotify.playerInfoList[0].uid = 1
            ScenePlayerInfoNotify.playerInfoList[0].onlinePlayerInfo.uid = 1
            // To protobuffer
            data = await dataUtil.objToProtobuffer(ScenePlayerInfoNotify, dataUtil.getPacketIDByProtoName("ScenePlayerInfoNotify"));
            sendPacketAsyncByName(kcpobj, "ScenePlayerInfoNotify", keyBuffer, data);

            //PlayerEnterSceneInfoNotify
            const PlayerEnterSceneInfoNotify = await dataUtil.dataToProtobuffer(fs.readFileSync("./bin/PlayerEnterSceneInfoNotify.bin"), dataUtil.getPacketIDByProtoName("PlayerEnterSceneInfoNotify"))
            PlayerEnterSceneInfoNotify.avatarEnterInfo[0].avatarEntityId = CharacterID
            // To protobuffer
            var PlayerEnterSceneInfoNotifyData = await dataUtil.objToProtobuffer(PlayerEnterSceneInfoNotify, dataUtil.getPacketIDByProtoName("PlayerEnterSceneInfoNotify"));
            sendPacketAsyncByName(kcpobj, "PlayerEnterSceneInfoNotify", keyBuffer, PlayerEnterSceneInfoNotifyData);

            //SyncTeamEntityNotify
            sendPacketAsyncByName(kcpobj, "SyncTeamEntityNotify", keyBuffer);

            //SyncScenePlayTeamEntityNotify
            sendPacketAsyncByName(kcpobj, "SyncScenePlayTeamEntityNotify", keyBuffer);

            //ScenePlayBattleInfoListNotify
            sendPacketAsyncByName(kcpobj, "ScenePlayBattleInfoListNotify", keyBuffer);

            //SceneTeamUpdateNotify
            sendPacketAsyncByName(kcpobj, "SceneTeamUpdateNotify", keyBuffer);

            //AllMarkPointNotify
            sendPacketAsyncByName(kcpobj, "AllMarkPointNotify", keyBuffer);

            //PlayerPropNotify1
            sendPacketAsyncByName(kcpobj, "PlayerPropNotify1", keyBuffer);

            //SceneInitFinishRsp
            // Response
            sendPacketAsyncByName(kcpobj, "SceneInitFinishRsp", keyBuffer);

            break;

        case "PathfindingEnterSceneReq": // PathfindingEnterSceneReq

            sendPacketAsyncByName(kcpobj, "PathfindingEnterSceneRsp", keyBuffer)


            break;

        case "EnterWorldAreaReq":

            var XD3 = WorldAreaCount > 0 ? WorldAreaCount : "";
            sendPacketAsyncByName(kcpobj, "EnterWorldAreaRsp" + XD3, keyBuffer)

            break;

        case "PostEnterSceneReq":

            sendPacketAsyncByName(kcpobj, "PostEnterSceneRsp", keyBuffer)

            break;

        case "GetActivityInfoReq": // GetActivityInfoReq

            sendPacketAsyncByName(kcpobj, "GetActivityInfoRsp", keyBuffer)

            break;

        case "GetShopmallDataReq":

            sendPacketAsyncByName(kcpobj, "GetShopmallDataRsp", keyBuffer)

            break;

        case "UnionCmdNotify":


            break;

        case "PlayerSetPauseReq": // PlayerSetPauseReq

            const PlayerSetPauseRsp = {
                retcode: 0
            }
            // Response
            // To protobuffer
            data = await dataUtil.objToProtobuffer(PlayerSetPauseRsp, dataUtil.getPacketIDByProtoName("PlayerSetPauseRsp"));
            sendPacketAsyncByName(kcpobj, "PlayerSetPauseRsp", keyBuffer, data)

            break;

        case "GetSceneAreaReq": // GetSceneAreaReq

            const GetSceneAreaRsp = {
                areaIdList: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,17,18],
                    cityInfoList: [
                        { cityId: 1, level: 8 },
                        { cityId: 2, level: 8 },
                        { cityId: 3, level: 10 }
                    ],
                        sceneId: 3
            }
            sendPacketAsyncByName(kcpobj, "GetSceneAreaRsp", keyBuffer, await dataUtil.objToProtobuffer(GetSceneAreaRsp, dataUtil.getPacketIDByProtoName("GetSceneAreaRsp")))
            break;
			
        case "GetScenePointReq": // GetScenePointReq
            PointList = []
            for (Possible = 0; Possible < 1000; Possible++) {
                PointList[Possible] = 0 + Possible
            }
            const GetScenePointRsp = { "unlockedPointList": PointList, "sceneId": 3 }

			sendPacketAsyncByName(kcpobj, "GetScenePointRsp", keyBuffer, await dataUtil.objToProtobuffer(GetScenePointRsp, dataUtil.getPacketIDByProtoName("GetScenePointRsp")))
            break;

        case "PrivateChatReq":
            let PrivateChatNotify = {
                chatInfo: {
                    uid: 636213502,
                    toUid: 636213502,
                    text: protobuff.text,
                    isRead: false
                }
            }
            data = await dataUtil.objToProtobuffer(PrivateChatNotify, dataUtil.getPacketIDByProtoName("PrivateChatNotify"));
            sendPacketAsyncByName(kcpobj, "PrivateChatNotify", keyBuffer, data)

            var toBuff = Buffer.from(protobuff.text)
            var command = toBuff.toString().split(" ")[0]
            var args = toBuff.toString().trim().split(" ")
            var reply = "PLACEHOLDER"
            switch (command) {
                case "inv":
                    if (args[1] == "add") {
                        const obj = {
                            "itemId": parseInt(args[2]),
                            "guid": "2681193339516092" + Math.random() * (99 - 10) + 10,
                        }
                        if (args[3] == "w") {
                            obj["equip"] = {
                                "weapon": {
                                    "level": args[4]
                                }
                            }
                        }
                        else if (args[3] == "m") {
                            obj["material"] = {
                                count: args[4]
                            }

                        } else {
                            reply = "Usage: inv (add) (w/m) (id) (level/count)"
                            break;
                        }
                        PlayerStoreNotify.itemList.push(obj);
                        data = await dataUtil.objToProtobuffer(PlayerStoreNotify, dataUtil.getPacketIDByProtoName("PlayerStoreNotify"));
                        sendPacketAsyncByName(kcpobj, "PlayerStoreNotify", keyBuffer, data)
                    }
                    else {
                        reply = "Usage: inv (add) (w/m) (id) (level/count)"
                        break;
                    }
                    reply = `Added ${args[3] == "m" ? "Material" : "Weapon"} number ${args[2]} with a ${args[3] == "m" ? "count" : "level"} of ${args[4]}`
                    break;
                case "s":
                case "send":
                    sendPacketAsyncByName(kcpobj, args[1], keyBuffer)
                    reply = `Sent packet ${dataUtil.getPacketIDByProtoName(args[1])} (${args[1]}) to client`
                    break;
                case "r":
                case "backtonormal":
                case "reset":
                case "restart":
                    sendPacketAsyncByName(kcpobj, "PlayerEnterSceneNotify", keyBuffer)
                    reply = "Restarting..."
                    break;
                case "w":
                case "weather":
                    const weatherCommandData = {
                        weatherValueMap: {},
                        weatherAreaId: parseInt(args[1]),
                        climateType: 3
                    }
                    sendPacketAsyncByName(kcpobj, "SceneAreaWeatherNotify", keyBuffer, await dataUtil.objToProtobuffer(weatherCommandData, dataUtil.getPacketIDByProtoName("SceneAreaWeatherNotify")))
                    reply = "Weather has been set to: " + args[1]
                    break;
                case "t":
                case "time":
                    const PlayerGameTimeNotifyData = {
                        gameTime: parseInt(args[1])
                    }
                    sendPacketAsyncByName(kcpobj, "PlayerGameTimeNotify", keyBuffer, await dataUtil.objToProtobuffer(PlayerGameTimeNotifyData, dataUtil.getPacketIDByProtoName("PlayerGameTimeNotify")))
                    reply = "Time has been set to: " + args[1]
                    break;
                case "av":
                case "avatar":
                    if (args[1] == "add" || args[1] == "a") {
                        ShowAvatarList.push(args[2])
                    }
                    else if (args[1] == "remove" || args[1] == "r") {
                        for (var _ in ShowAvatarList)
                            if (_ == args[2])
                                ShowAvatarList.splice(_, 1)
                    }
                    else if (args[1] == "list" || args[1] == "l") {
                        reply = ShowAvatarList
                    }
                    else {
                        reply = "Usage: av ([a]dd/[r]emove/[l]ist) (id)\n\nNOTE: [R]EMOVE IS BY INDEX NOT BY VALUE"
                        break;
                    }
                    break;
				case "pos":
                case "loc":
                    const SceneEntityAppearNotify5 = {
                        "entityList": [{
                            "motionInfo": {
                                "pos":
                                {
                                    "X": parseInt(args[1]) || 0,
                                    "Y": parseInt(args[2]) || 0,
                                    "Z": parseInt(args[3]) || 0
                                },
                                "rot":
                                {
                                    "Y": parseInt(args[4]) || 0
                                }
                            }
                        }],
                    }
                    sendPacketAsyncByName(kcpobj, "SceneEntityAppearNotify", keyBuffer, await dataUtil.objToProtobuffer(SceneEntityAppearNotify5, dataUtil.getPacketIDByProtoName("SceneEntityAppearNotify")))
                    reply = `Player Pos is now X: ${SceneEntityAppearNotify5.entityList[0].motionInfo.pos.X}
                    Y: ${SceneEntityAppearNotify5.entityList[0].motionInfo.pos.Y}
                    Z: ${SceneEntityAppearNotify5.entityList[0].motionInfo.pos.Z}
                    ROT: ${SceneEntityAppearNotify5.entityList[0].motionInfo.rot.Y}`
                    break;
                default:
                    reply = "Command doesnt seem to exist..."
            }

            PrivateChatNotify = {
                chatInfo: {
                    uid: 620336771,
                    toUid: 624263971,
                    text: reply,
                    isRead: false
                }
            }
            data = await dataUtil.objToProtobuffer(PrivateChatNotify, dataUtil.getPacketIDByProtoName("PrivateChatNotify"));
            sendPacketAsyncByName(kcpobj, "PrivateChatNotify", keyBuffer, data)

            sendPacketAsyncByName(kcpobj, "PrivateChatRsp", keyBuffer)

            break;

        case "GetScenePointReq": // GetScenePointReq

            // Response
            var XD = PointRspCount > 0 ? PointRspCount : "";
            sendPacketAsyncByName(kcpobj, "GetScenePointRsp" + XD, keyBuffer)
            PointRspCount++

            break;

        case "GetWidgetSlotReq":

            sendPacketAsyncByName(kcpobj, "GetWidgetSlotRsp", keyBuffer)

            break;

        case "GetRegionSearchReq":

            sendPacketAsyncByName(kcpobj, "RegionSearchNotify", keyBuffer)

            break;

        case "ReunionBriefInfoReq": // ReunionBriefInfoReq

            sendPacketAsyncByName(kcpobj, "ReunionBriefInfoRsp", keyBuffer)

            break;

        case "GetAllActivatedBargainDataReq": // GetAllActivatedBargainDataReq

            sendPacketAsyncByName(kcpobj, "GetAllActivatedBargainDataRsp", keyBuffer);

            break;

        case "GetPlayerFriendListReq": // GetPlayerFriendListReq

            sendPacketAsyncByName(kcpobj, "GetPlayerFriendListRsp", keyBuffer);
            break;

        case "ClientAbilityInitFinishNotify": // ClientAbilityInitFinishNotify

            console.log("ClientAbilityInitFinishNotify")

            break;

        case "TowerAllDataReq":

            sendPacketAsyncByName(kcpobj, "TowerAllDataRsp", keyBuffer);

            break;

        case "GetShopReq":
            //console.log("XD %i", protobuff.shopType)
            //sendPacketAsyncByName(kcpobj, "GetShopRsp4", keyBuffer);

            break;

        case "GetGachaInfoReq":
            const GetGachaInfoRsp = await dataUtil.dataToProtobuffer(fs.readFileSync("./bin/GetGachaInfoRsp.bin"), dataUtil.getPacketIDByProtoName("GetGachaInfoRsp"))
            GetGachaInfoRsp.gachaInfoList[0].tenCostItemNum = 0
            GetGachaInfoRsp.gachaInfoList[0].costItemNum = 0
            // To protobuffer
            data = await dataUtil.objToProtobuffer(GetGachaInfoRsp, dataUtil.getPacketIDByProtoName("GetGachaInfoRsp"));
            sendPacketAsyncByName(kcpobj, "GetGachaInfoRsp", keyBuffer, data)
            break;

        case "DoGachaReq":
            const DoGachaRsp = await dataUtil.dataToProtobuffer(fs.readFileSync("./bin/DoGachaRsp.bin"), dataUtil.getPacketIDByProtoName("DoGachaRsp"))
            DoGachaRsp.tenCostItemNum = 0
            for(let x = 0; x<19; x++) {
                DoGachaRsp.gachaItemList[x] = {
                        transferItems: [],
                        tokenItemList: [ { itemId: 222, count: 15 } ],
                        gachaItem_: { itemId: GachaRspValue + x, count: 1 }
                }
            }

            // To protobuffer
            data = await dataUtil.objToProtobuffer(DoGachaRsp, dataUtil.getPacketIDByProtoName("DoGachaRsp"));
            sendPacketAsyncByName(kcpobj, "DoGachaRsp", keyBuffer, data)
            break;
            
        case "SetPlayerSignatureReq":
            GachaRspValue = parseInt(protobuff.signature)
            const SetPlayerSignatureRsp = {
                retcode: 0,
                signature: protobuff.signature
            }
            data = await dataUtil.objToProtobuffer(SetPlayerSignatureRsp, dataUtil.getPacketIDByProtoName("SetPlayerSignatureRsp"));
            sendPacketAsyncByName(kcpobj, "SetPlayerSignatureRsp", keyBuffer, data)
            break;
        case "EntityConfigHashNotify":
        case "EvtAiSyncCombatThreatInfoNotify":
        case "ClientAbilityChangeNotify":
        case "ObstacleModifyNotify":
        case "QueryPathReq":
        case "SetEntityClientDataNotify":
            break;
        default:
            console.log(c.colog(32, "UNHANDLED PACKET: ") + packetID + "_" + dataUtil.getProtoNameByPacketID(packetID))
            return;
    }
}


module.exports = {

    execute(port) {

        var output = async function (data, size, context) {
            // For some reason some data is undefined or null
            if (data == undefined || data == null || data == NaN) return;
            // Some type of detector for stupid packets
            if (data.length > 26 && data != undefined) {
                data = dataUtil.formatSentPacket(data, token); // Formatting
                // WARNING - MIGHT BE DELETED \\

                var arrayData = dataUtil.getPackets(data); // Splitting all the packets
                for (var k in arrayData) { // In all the splitted packets
                    // send one by one
                    server.send(arrayData[k], 0, arrayData[k].length, context.port, context.address);
                    //console.log("[SENT] " + arrayData[k].toString('hex'))

                }
                return
            }
            server.send(data, 0, size, context.port, context.address);
        };

        server.on('error', (error) => {
            // Wtffff best error handler
            server.close();
        });

        server.on('message', async (data, rinfo) => {
            // Extracted from KCP example lol
            var k = rinfo.address + '_' + rinfo.port + '_' + data.readUInt32LE(0).toString(16);
            var bufferMsg = Buffer.from(data);

            // Detects if its a handshake
            if (bufferMsg.byteLength <= 20) {
                var ret = handleHandshake(bufferMsg, bufferMsg.readInt32BE(0)); // Handling:TM:
                ret.encode(); // Some stupid handshake class i made
                console.log("[HANDSHAKE]")
                // send
                server.send(ret.buffer, 0, ret.buffer.byteLength, rinfo.port, rinfo.address);
                return
            }

            // More stolen shit
            if (undefined === clients[k]) {
                var context = {
                    address: rinfo.address,
                    port: rinfo.port
                };
                var kcpobj = new kcp.KCP(data.readUInt32LE(0), context);
                kcpobj.nodelay(1, 10, 2, 1);
                kcpobj.output(output);
                clients[k] = kcpobj;
            }
            // token! [hardcoded]
            token = data.readUInt32BE(4);

            // Finally getting into the important shit
            var kcpobj = clients[k];
            var reformatedPacket = await dataUtil.reformatKcpPacket(bufferMsg);
            kcpobj.input(reformatedPacket) // fuck you
            kcpobj.update(Date.now())


            var recv = kcpobj.recv();
            if (recv) {
                var packetRemHeader = recv; // Removes Modified KCP Header and leaves the data

                // console.log(c.colog(31, "[RECV] %s"), packetRemHeader.toString('hex'))

                var keyBuffer = seedKey == undefined ? initialKey : seedKey;    // Gets the key data
                dataUtil.xorData(packetRemHeader, keyBuffer);   // xors the data into packetRemHeader

                // Check if the recived data is a packet
                if (packetRemHeader.length > 5 && packetRemHeader.readInt16BE(0) == 0x4567 && packetRemHeader.readUInt16BE(packetRemHeader.byteLength - 2) == 0x89AB) {
                    var packetID = packetRemHeader.readUInt16BE(2); // Packet ID
                    if (![2349, 373, 3187, 19, 1, 49].includes(packetID)) {
						var dataBuffer = await dataUtil.dataToProtobuffer(dataUtil.parsePacketData(recv), packetID);
						console.log(dataBuffer);
                        console.log(c.colog(32, "[KCP] Got packet %i (%s)"), packetID, dataUtil.getProtoNameByPacketID(packetID)); // Debug
                    }


                    var noMagic = dataUtil.parsePacketData(packetRemHeader); // Parse packet data

                    // [DEBUG] if packet is not known then its stored there with its data
                    if (packetID == parseInt(dataUtil.getProtoNameByPacketID(packetID))) {
                        console.log("[UNK PACKET] " + packetRemHeader.toString('hex'));
                        fs.appendFile("./unk/unknown_packets/" + packetID, "unknown", (err) => {
                            if (err)
                                throw err
                        })
                        return;
                    }

                    // yeah whatever this shit
                    var dataBuffer = await dataUtil.dataToProtobuffer(noMagic, packetID);
                    handleSendPacket(dataBuffer, packetID, kcpobj, keyBuffer);
                }

            }

        });

        // yooo kcp listening
        server.on('listening', () => {
            var address = server.address();
            console.log(`[KCP ${address.port}] LISTENING.`); // He do be listenin doe
        });

        server.bind(port); // binds
    }
}
