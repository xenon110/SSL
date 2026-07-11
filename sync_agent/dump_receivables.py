from tally_client import TallyClient

client = TallyClient("http://localhost:9000")
xml_out = client.export_outstandings("Receivables")
with open("raw_receivables.xml", "w", encoding="utf-8") as f:
    f.write(xml_out)
print("Saved raw_receivables.xml")
