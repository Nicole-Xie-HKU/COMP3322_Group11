library(readxl)
library(jsonlite)
library(tidyverse)
HKU <- read_excel("C:/Users/xie20/Downloads/2026-27 class_timetable_20260902.xlsx")

head(HKU$`START TIME`)
names(HKU)

HKU$`START TIME` <- format(HKU$`START TIME`, "%H:%M")
HKU$`END TIME` <- format(HKU$`END TIME`, "%H:%M")

       
json <- toJSON(HKU,
               pretty = TRUE,
               dataframe = "rows",
               na = "null")

write(json, "HKU_timetable_2026-2027.json")

HKU_json <- read_json("HKU_timetable_2026-2027.json")

head(HKU_json)
summary(HKU_json)
