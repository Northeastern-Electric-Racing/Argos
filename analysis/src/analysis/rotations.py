from .psql import make_request


def main():
    start_time = "04-01-2025 21:00:08"
    end_time = "07-01-2025 21:01:50"

    result = make_request(
        f"""
        SELECT SUM(((rpm + next_rpm) / 2.0) * (EXTRACT(EPOCH FROM next_time - time) / 60.0)) AS total_revolutions
            FROM (
               SELECT
                  time,
                  values[1] / 10 AS rpm,
                  LEAD(time) OVER (ORDER BY time) AS next_time,
                  LEAD(values[1] / 10) OVER (ORDER BY time) AS next_rpm
               FROM data
               WHERE \"dataTypeName\" = 'DTI/RPM/ERPM' AND time BETWEEN '{start_time}' AND '{end_time}'
            ) t
            WHERE next_time IS NOT NULL
            AND EXTRACT(EPOCH FROM next_time - time) <= 1.0;
         """
    )
    print("result: ", result)


if __name__ == "__main__":
    main()
