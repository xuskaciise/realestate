const mongoose = require("mongoose");

const [, , mongoUri, usernameArg] = process.argv;

if (!mongoUri) {
  console.error(
    "Usage: node scripts/activate-admin.cjs <MONGODB_URI> [username]\n" +
      'Example: node scripts/activate-admin.cjs "mongodb+srv://.../mydb" admin'
  );
  process.exit(1);
}

const UserSchema = new mongoose.Schema(
  {
    fullname: String,
    username: String,
    password: String,
    type: String,
    status: String,
    profile: String,
  },
  {
    collection: "users",
    timestamps: true,
  }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function run() {
  await mongoose.connect(mongoUri);

  const filter = usernameArg
    ? { username: { $regex: `^${usernameArg}$`, $options: "i" } }
    : { type: "Admin" };

  const update = {
    $set: {
      status: "Active",
      type: "Admin",
    },
  };

  const result = await User.updateMany(filter, update);
  console.log(
    `Matched: ${result.matchedCount}, Updated: ${result.modifiedCount}`
  );

  const users = await User.find(filter)
    .select("username type status")
    .lean();
  console.log("Affected users:", users);
}

run()
  .catch((error) => {
    console.error("Failed to activate admin user:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {}
  });

