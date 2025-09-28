import xlsxwriter
import uuid
import io

def generate_polish_invoice_xlsx(data):

    # Create workbook in memory
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet()
    worksheet.hide_gridlines(2)
    worksheet.fit_to_pages(1, 1)

    worksheet.set_column("A:J", 18)

    worksheet.merge_range("A1:J2", "FAKTURA", workbook.add_format({
        "bold": 1,
        "border": 1,
        "align": "center",
        "valign": "vcenter",
    }))

    worksheet.merge_range("A3:E3", "Eksporter handlowy:", workbook.add_format({
        "bold": 1,
        "border": 1,
        "align": "left",
        "valign": "vcenter",
    }))

    worksheet.merge_range("F3:H3", "Numer i data faktury", workbook.add_format({
        "bold": 1,
        "border": 1,
        "align": "left",
        "valign": "vcenter",
    }))

    worksheet.merge_range("I3:J3", "Numer referencyjny eksportera:", workbook.add_format({
        "bold": 1,
        "border": 1,
        "align": "left",
        "valign": "vcenter",
    }))

    worksheet.merge_range("A4:E8", data["merchant_exporter"], workbook.add_format({
        "bold": 1,
        "border": 1,
        "text_wrap": True,
        "align": "left",
        "valign": "top",
    }))

    worksheet.merge_range("F4:H4", f"{data['invoice_number']} Data: {data['invoice_date']}", workbook.add_format({
        "bold": 1,
        "border": 1,
        "align": "left",
        "valign": "vcenter",
    }))

    worksheet.merge_range("I4:J4", data["exporter_reference"], workbook.add_format({
        "bold": 1,
        "border": 1,
        "align": "left",
        "valign": "vcenter",
    }))

    worksheet.merge_range("F5:J6", "Numer i data zamówienia kupującego:", workbook.add_format({
        "bold": 1,
        "border": 1,
        "align": "left",
        "valign": "top",
    }))

    worksheet.merge_range("F7:J8", f"Inne odniesienia: EDF FORMULARZ NR : \nData : {data['invoice_date']}", workbook.add_format({
        "bold": 1,
        "border": 1,
        "text_wrap": True,
        "align": "left",
        "valign": "vcenter",
    }))

    worksheet.merge_range("A9:E9", "Odbiorca:", workbook.add_format({
        "bold": 1,
        "border": 1,
        "text_wrap": True,
        "align": "left",
        "valign": "top",
    }))

    worksheet.merge_range("F9:J9", "Nabywca (jeśli inny niż odbiorca):", workbook.add_format({
        "bold": 1,
        "border": 1,
        "align": "left",
        "valign": "vcenter",
    }))

    worksheet.merge_range("A10:E17", data["consignee"], workbook.add_format({
        "bold": 1,
        "border": 1,
        "text_wrap": True,
        "align": "left",
        "valign": "top",
    }))

    worksheet.merge_range("F10:J16", data["buyer"], workbook.add_format({
        "bold": 1,
        "border": 1,
        "text_wrap": True,
        "align": "left",
        "valign": "top",
    }))
    
    worksheet.merge_range("A18:B19", f"Przewóz wstępny przez: \n{data['pre_carriage_by']}", workbook.add_format({
        "bold": 1,
        "border": 1,
        "text_wrap": True,
        "align": "left",
        "valign": "top",
    }))

    worksheet.merge_range("C18:E19", f"Miejsce odbioru przez przewoźnika wstępnego: \n{data['place_of_receipt']}", workbook.add_format({
        "bold": 1,
        "border": 1,
        "text_wrap": True,
        "align": "left",
        "valign": "top",
    }))

    worksheet.merge_range("A20:B21", f"Numer statku/lotu \n{data['vessel_number']}", workbook.add_format({
        "bold": 1,
        "border": 1,
        "text_wrap": True,
        "align": "left",
        "valign": "top",
    }))

    worksheet.merge_range("C20:E21", f"Port załadunku \n{data['port_of_loading']}", workbook.add_format({
        "bold": 1,
        "border": 1,
        "text_wrap": True,
        "align": "left",
        "valign": "top",
    }))

    worksheet.merge_range("A22:B23", f"Port rozładunku \n{data['port_of_discharge']}", workbook.add_format({
        "bold": 1,
        "border": 1,
        "text_wrap": True,
        "align": "left",
        "valign": "top",
    }))

    worksheet.merge_range("C22:E23", f"Ostateczny cel \n{data['final_destination']}", workbook.add_format({
        "bold": 1,
        "border": 1,
        "text_wrap": True,
        "align": "left",
        "valign": "top",
    }))

    worksheet.merge_range("F17:H18", f"Kraj pochodzenia towarów: \n{data['country_of_origin_of_goods']}", workbook.add_format({
        "bold": 1,
        "border": 1,
        "text_wrap": True,
        "align": "left",
        "valign": "top",
    }))

    worksheet.merge_range("I17:J18", f"Kraj docelowy: \n{data['country_of_final_destination']}", workbook.add_format({
        "bold": 1,
        "border": 1,
        "text_wrap": True,
        "align": "left",
        "valign": "top",
    }))

    worksheet.merge_range("F19:J19", f"Warunki dostawy i płatności:", workbook.add_format({
        "bold": 1,
        "top": 1,
        "left": 1,
        "right": 1,
        "text_wrap": True,
        "align": "left",
        "valign": "vcenter",
    }))

    worksheet.write("F20", "Warunki", workbook.add_format({
        "bold": 1,
        "align": "left",
        "valign": "vcenter",
    }))

    worksheet.merge_range("G20:J20", data["terms"], workbook.add_format({
        "bold": 1,
        "right": 1,
        "text_wrap": True,
        "align": "left",
        "valign": "vcenter",
    }))

    worksheet.merge_range("F21:F22", "Bankier", workbook.add_format({
        "bold": 1,
        "align": "left",
        "valign": "vcenter",
    }))

    worksheet.merge_range("G21:J22", data["banker"], workbook.add_format({
        "bold": 1,
        "right": 1,
        "text_wrap": True,
        "align": "left",
        "valign": "vcenter",
    }))

    worksheet.merge_range("F23:J23", f"A/C Code: {data['account_code']} Swift Code: {data['swift_code']} (AD Code No.: {data['ad_code']})", workbook.add_format({
        "bold": 1,
        "right": 1,
        "bottom": 1,
        "text_wrap": True,
        "align": "left",
        "valign": "vcenter",
    }))

    worksheet.write("A24", "Marks & Nos.", workbook.add_format({
        "bold": 1,
        "left": 1,
        "align": "left",
        "valign": "vcenter",
    }))
    
    worksheet.write("B24", "Liczba i rodzaj opakowań.", workbook.add_format({
        "bold": 1,
        "align": "left",
        "valign": "vcenter",
    }))

    worksheet.merge_range("E24:F24", "Opis towaru", workbook.add_format({
        "bold": 1,
        "right": 1,
        "text_wrap": True,
        "align": "left",
        "valign": "vcenter",
    }))

    worksheet.write("G24", "UOM", workbook.add_format({
        "bold": 1,
        "right": 1,
        "align": "center",
        "valign": "vcenter",
    }))

    worksheet.write("H24", "Ilość", workbook.add_format({
        "bold": 1,
        "right": 1,
        "align": "center",
        "valign": "vcenter",
    }))

    worksheet.write("I24", "Stawka USD $", workbook.add_format({
        "bold": 1,
        "right": 1,
        "align": "left",
        "valign": "vcenter",
    }))

    worksheet.write("J24", "Kwota USD $", workbook.add_format({
        "bold": 1,
        "right": 1,
        "align": "left",
        "valign": "vcenter",
    }))

    worksheet.write("D27", "Waga brutto (gramy)", workbook.add_format({
        "bold": 1,
        "text_wrap": True,
        "align": "center",
        "valign": "vcenter",
    }))

    worksheet.write("E27", "Waga netto (gramy)", workbook.add_format({
        "bold": 1,
        "text_wrap": True,
        "align": "center",
        "valign": "vcenter",
    }))

    row_start = 29

    for row_num, item in enumerate(data.get("items", [])):
        
        worksheet.merge_range(f"A{row_num + row_start}:B{row_num + row_start}", item.get("description",""), workbook.add_format({
            "bold": 1,
            "left": 1,
            "text_wrap": True,
            "align": "left",
            "valign": "vcenter",
        }))

        worksheet.write(f"C{row_num + row_start}", item.get("type",""), workbook.add_format({
            "bold": 1,
            "text_wrap": True,
            "align": "left",
            "valign": "vcenter",
        }))

        worksheet.write(f"D{row_num + row_start}", item.get("gross_wt",""), workbook.add_format({
            "bold": 1,
            "num_format": "0.000",
            "text_wrap": True,
            "align": "center",
            "valign": "vcenter",
        }))

        worksheet.write(f"E{row_num + row_start}", item.get("net_wt",""), workbook.add_format({
            "bold": 1,
            "text_wrap": True,
            "align": "center",
            "valign": "vcenter",
        }))

        worksheet.write(f"F{row_num + row_start}", item.get("hs_code",""), workbook.add_format({
            "bold": 1,
            "right": 1,
            "text_wrap": True,
            "align": "center",
            "valign": "vcenter",
        }))

        worksheet.write(f"G{row_num + row_start}", item.get("uom",""), workbook.add_format({
            "bold": 1,
            "right": 1,
            "text_wrap": True,
            "align": "center",
            "valign": "vcenter",
        }))

        worksheet.write(f"H{row_num + row_start}", item.get("quantity",""), workbook.add_format({
            "bold": 1,
            "right": 1,
            "text_wrap": True,
            "align": "center",
            "valign": "vcenter",
        }))

        worksheet.write(f"I{row_num + row_start}", item.get("rate",""), workbook.add_format({
            "bold": 1,
            "right": 1,
            "text_wrap": True,
            "align": "right",
            "valign": "vcenter",
        }))

        worksheet.write(f"J{row_num + row_start}", item.get("amount",""), workbook.add_format({
            "bold": 1,
            "right": 1,
            "text_wrap": True,
            "align": "right",
            "valign": "vcenter",
        }))
       
    table_end_row = row_start + len(data.get("items", []))

    worksheet.write(f"D{table_end_row+1}", "{"+ f"=SUM(D{row_start}:D{table_end_row-1})" +"}", workbook.add_format({
        "bold": 1,
        "top": 1,
        "bottom": 1,
        "num_format": "0.000",
        "text_wrap": True,
        "align": "center",
        "valign": "vcenter",
    }))

    worksheet.write(f"E{table_end_row+1}", "{"+ f"=SUM(E{row_start}:E{table_end_row-1})" +"}", workbook.add_format({
        "bold": 1,
        "top": 1,
        "bottom": 1,
        "num_format": "0.000",
        "text_wrap": True,
        "align": "center",
        "valign": "vcenter",
    }))

    worksheet.merge_range(f"A{table_end_row+3}:F{table_end_row+4}", f"DOSTAWA PRZEZNACZONA NA EKSPORT LIST ZOBOWIĄZANIA BEZ \nPŁATNOŚCI IGST POD NUMEREM LUT ARN. {data.get('arn_number','')}", workbook.add_format({
        "bold": 1,
        "left": 1,
        "right": 1,
        "text_wrap": True,
        "align": "left",
        "valign": "vcenter",
    }))
    workbook.close()
    
    # Return the workbook data as bytes
    output.seek(0)
    return output.getvalue()

# data = {
#     "merchant_exporter": "Estrella Jewels LLP\n312, OPTIONS PRIMO PREMISES CHSL,\nMAROL INDUSTRIAL ESTATE, MIDC CROSS ROAD NO.21\nANDHERI EAST, MUMBAI 400 093, India.\nGSTIN 27AADFE3151H1ZP",
#     "invoice_number": "EJL/25-26/448",
#     "invoice_date": "26-07-2025",
#     "exporter_reference": "IEC NO. 0311011098",
#     "consignee": "Estrella Jewels Sp. z o.o., Sp. k.\nUl. Sabaly 58, 02-174 warszawa\nPoland\nVAT Nr. - 5252812119 REGON - 385302234\nContact Person : Amit Gupta\nTel : 0048 222583398 Fax : ",
# 	"buyer": "Estrella Jewels Sp. z o.o., Sp. k.\nUl. Wybrzeze Kosciuszkowskie 31/33. 00-379 Warszawa, Poland ",
#     "pre_carriage_by": "DHL",
#     "place_of_receipt": "INDIA",
#     "vessel_number": "AIR FREIGHT",
#     "port_of_loading": "MUMBAI",
#     "port_of_discharge": "WARSAW",
#     "final_destination": "POLAND",
#     "country_of_origin_of_goods": "INDIA",
#     "country_of_final_destination": "POLAND",
#     "terms": "90 Days",
#     "banker": "KOTAK MAHINDRA BANK LIMITED\nJVPD SCHEME, JUHU, VILE PARLE WEST, MUMBAI 400049, INDIA",
#     "account_code": "8611636434",
#     "swift_code": "KKBKINBB",
#     "ad_code": "018017129100091",
#     "items": [
#         {
#             "description": "PCS, SL925 SILVER Stud 18k Com Diam Jew",
#             "type": "BRACELET",
#             "hsn_code": "71131990",
#             "uom": "PCS",
#             "quantity": 1,
#             "gross_wt": 12.7,
#             "net_wt": 12.647,
#             "rate": 228,
#             "amount": 228
#         },
#         {
#             "description": "PCS, SL925 SILVER Stud 18k Com Diam Jew",
#             "type": "NECKLACE",
#             "hsn_code": "71131990",
#             "uom": "PCS",
#             "quantity": 2,
#             "gross_wt": 17.77,
#             "net_wt": 17.359,
#             "rate": 554,
#             "amount": 1108
#         },
#         {
#             "description": "PCS, SL925 SILVERStud With Diam Jewel",
#             "type": "RING",
#             "hsn_code": "71131143",
#             "uom": "PCS",
#             "quantity": 2,
#             "gross_wt": 3.19,
#             "net_wt": 2.793,
#             "rate": 406,
#             "amount": 812
#         }
#     ],
#     "arn_number": "AD270325107604A",
}
generate_polish_invoice_xlsx(data)