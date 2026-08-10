import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync(".env.local", "utf8");
let supabaseUrl = "";
let supabaseKey = "";
envContent.split("\n").forEach(line => {
    if (line.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) supabaseUrl = line.split("=")[1].replace(/"/g, "").trim();
    if (line.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY=")) supabaseKey = line.split("=")[1].replace(/"/g, "").trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: metrics } = await supabase.from('dashboard_metrics').select('company_name').limit(5);
    console.log("Companies in DB:", metrics);
}
run();
