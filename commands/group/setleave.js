const fs = require("fs");
const path = require("path");

module.exports = {
  name: "setleave",
  description: "Mengatur pesan perpisahan untuk grup (admin-only)",
  aliases: ["leave"],
  usage: "setleave [pesan|on|off]",
  category: "group",
  async execute(message, sock, args) {
    const jid = message.key.remoteJid;
    const isGroup = jid.endsWith("@g.us");

    if (!isGroup) {
      await sock.sendMessage(jid, {
        text: "❌ Command ini hanya bisa digunakan di grup!",
      });
      return;
    }

    // Periksa apakah bot adalah admin
    const metadata = await sock.groupMetadata(jid);
    const botId = sock.user.lid;
    const botIdTrim = botId.replace(/:\d+/, "");
    const botIsAdmin = metadata.participants
      .find((p) => p.id === botIdTrim)
      ?.admin?.includes("admin");
      
    if (!botIsAdmin) {
      await sock.sendMessage(jid, { text: '❌ Bot bukan admin, tidak bisa mengatur pesan perpisahan!' });
      return;
    }

    const sender = message.key.participant || message.key.remoteJid;
    const senderIsAdmin = metadata.participants
      .find((p) => p.id === sender)
      ?.admin?.includes("admin");

    if (!senderIsAdmin) {
      await sock.sendMessage(jid, {
        text: "❌ Hanya admin grup yang bisa menggunakan command ini!",
      });
      return;
    }

    const action = args[0]?.toLowerCase();
    const groupSettingsPath = path.join(
      __dirname,
      "..",
      "..",
      "data",
      "groupSettings.json",
    );
    let groupSettings = {};
    if (fs.existsSync(groupSettingsPath)) {
      groupSettings = JSON.parse(
        fs.readFileSync(groupSettingsPath, "utf8"),
      );
    }
    if (!groupSettings[jid]) {
      groupSettings[jid] = {};
    }

    if (action === "on") {
      groupSettings[jid].leaveEnabled = true;
      fs.writeFileSync(
        groupSettingsPath,
        JSON.stringify(groupSettings, null, 2),
      );
      await sock.sendMessage(jid, {
        text: "✅ Pesan perpisahan telah diaktifkan.",
      });
      return;
    }

    if (action === "off") {
      groupSettings[jid].leaveEnabled = false;
      fs.writeFileSync(
        groupSettingsPath,
        JSON.stringify(groupSettings, null, 2),
      );
      await sock.sendMessage(jid, {
        text: "✅ Pesan perpisahan telah dinonaktifkan.",
      });
      return;
    }
    
    if (args.length === 0) {
      await sock.sendMessage(jid, {
        text: "Penggunaan: !setleave [pesan|on|off]\n\nPlaceholder yang tersedia:\n- @user (mention pengguna)\n- {groupName} (nama grup)",
      });
      return;
    }

    const leaveMessage = args.join(" ");
    groupSettings[jid].leave = leaveMessage;
    groupSettings[jid].leaveEnabled = true;

    fs.writeFileSync(
      groupSettingsPath,
      JSON.stringify(groupSettings, null, 2),
    );

    await sock.sendMessage(jid, {
      text: `✅ Pesan perpisahan berhasil diatur dan diaktifkan:\n\n${leaveMessage}`,
    });
  },
};