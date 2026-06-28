import { apiGet } from "../utils/api.js";

const Dashboard = {

    async init() {

        try {

            await this.loadDashboard();

        }

        catch (err) {

            console.error(err);

        }

    },

    async loadDashboard() {

        await Promise.all([

            this.loadInquiryStats(),
            this.loadBookingStats(),
            this.loadRecentActivity()

        ]);

    },

    async loadInquiryStats() {

        try {

            const inquiries = await apiGet("/api/admin/inquiries");

            const total = inquiries.length;

            const newCount = inquiries.filter(i => i.status === "New").length;

            const booked = inquiries.filter(i => i.status === "Booked").length;

            const quoted = inquiries.filter(i => i.status === "Quoted").length;

            this.setValue("statArrivals", booked);
            this.setValue("notificationCount", newCount);
            this.setValue("inquiryBadge", newCount);

            const statRevenue = document.getElementById("statRevenue");

            if (statRevenue) {

                statRevenue.textContent = `${quoted} Quotes`;

            }

        }

        catch (e) {

            console.error(e);

        }

    },

    async loadBookingStats() {

        try {

            const bookings = await apiGet("/api/admin/bookings");

            const total = bookings.length;

            const pending = bookings.filter(b =>

                b.paymentStatus !== "Paid"

            ).length;

            this.setValue("statOccupancy", total);

            this.setValue("statPendingPayments", pending);

        }

        catch (e) {

            console.error(e);

        }

    },

    async loadRecentActivity() {

        const box = document.getElementById("recentActivity");

        if (!box) return;

        box.innerHTML = "";

        try {

            const inquiries = await apiGet("/api/admin/inquiries");

            inquiries
                .sort((a, b) =>

                    new Date(b.createdAt || b.created_at)

                    -

                    new Date(a.createdAt || a.created_at)

                )

                .slice(0, 8)

                .forEach(item => {

                    const div = document.createElement("div");

                    div.className = "activity-item";

                    div.innerHTML = `

                        <div>

                            <strong>${item.name || item.guestName || "Guest"}</strong>

                            <div class="text-soft">

                                ${item.type || "Inquiry"}

                            </div>

                        </div>

                        <span class="badge badge-new">

                            ${item.status}

                        </span>

                    `;

                    box.appendChild(div);

                });

        }

        catch (e) {

            console.error(e);

        }

    },

    setValue(id, value) {

        const el = document.getElementById(id);

        if (!el) return;

        el.textContent = value;

    }

};

export default Dashboard;
