library(readxl)
library(jsonlite)
library(tidyverse)
library(dplyr)
HKU <- read_excel("C:/Users/xie20/Downloads/2026-27 class_timetable_20260902.xlsx")

head(HKU$`START TIME`)
names(HKU)

HKU$`START TIME` <- format(HKU$`START TIME`, "%H:%M")
HKU$`END TIME` <- format(HKU$`END TIME`, "%H:%M")

HKU$INSTRUCTOR <- strsplit(HKU$INSTRUCTOR, ";\\s*")
HKU$INSTRUCTOR[[1]]



day_cols <- c(
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN"
)

HKU$DAYS <- apply(
  HKU[, day_cols],
  1,
  function(x) {
    names(x)[!is.na(x)][1]
  }
)

HKU <- HKU[, !(names(HKU) %in% day_cols)]

merged <- HKU %>%
  group_by(`COURSE CODE`, `CLASS SECTION`) %>%
  summarise(
    
    TERM = first(TERM),
    ACAD_CAREER = first(ACAD_CAREER),
    CLASS_NUMBER = first(`CLASS NUMBER`),
    
    COURSE_TITLE = first(`COURSE TITLE`),
    OFFER_DEPT = first(`OFFER DEPT`),
    
    START_DATE = first(`START DATE`),
    END_DATE = last(`END DATE`),
    
    INSTRUCTORS = list(unique(unlist(INSTRUCTOR))),
    
    MEETINGS = list(
      unique(
        data.frame(
          DAY = DAYS,
          START_TIME = `START TIME`,
          END_TIME = `END TIME`,
          VENUE = VENUE
        )
      )
    ),
    
    .groups = "drop"
  )



head(merged)
       
View(merged)

json <- toJSON(merged,
               pretty = TRUE,
               dataframe = "rows",
               na = "null",
               auto_unbox = FALSE)

write(json, "HKU_timetable_2026-2027.json")

HKU_json <- read_json("HKU_timetable_2026-2027.json")

head(HKU_json)
