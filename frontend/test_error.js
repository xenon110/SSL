import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envContent = fs.readFileSync(".env.local", "utf8");
let supabaseUrl = "";
let supabaseKey = "";
envContent.split("\n").forEach(line => {
    if (line.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) supabaseUrl = line.split("=")[1].replace(/"/g, "").trim();
    if (line.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) supabaseKey = line.split("=")[1].replace(/"/g, "").trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    let metricsQuery = supabase.from('dashboard_metrics').select('*').order('created_at', { ascending: false }).limit(1);
    const { data: metrics, error } = await metricsQuery.single();
    console.log("Error:", error);
}
run();
